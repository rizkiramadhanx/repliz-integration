import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ScrapeBatchJobEntity } from '../entities/scrape-batch-job.entity';
import { ScrapedPostEntity } from '../entities/scraped-post.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { scrapeLatestInstagramPosts } from '../../auto-post-rules/worker/instagram-scraper.util';
import { SCRAPE_BATCH_QUEUE_NAME } from './scrape-batch-queue.constants';

export interface ScrapeBatchJobData {
  batchJobId: string;
}

@Processor(SCRAPE_BATCH_QUEUE_NAME, { concurrency: 1 })
export class ScrapeBatchProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeBatchProcessor.name);

  constructor(
    @InjectRepository(ScrapeBatchJobEntity)
    private readonly batchRepo: Repository<ScrapeBatchJobEntity>,
    @InjectRepository(ScrapedPostEntity)
    private readonly scrapedRepo: Repository<ScrapedPostEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectQueue(SCRAPE_BATCH_QUEUE_NAME)
    private readonly queue: Queue,
    private readonly emitter: EventEmitter2,
  ) {
    super();
  }

  // Payload WebSocket harus snake_case, konsisten dengan response REST
  // (serializeScraped di scrape-batches.service.ts) — kalau entity TypeORM
  // mentah (camelCase) di-emit langsung, frontend yang baca field snake_case
  // (thumbnail_url, is_video) akan selalu dapat undefined.
  private serializeForEmit(row: ScrapedPostEntity) {
    return {
      id: row.id,
      batch_job_id: row.batchJobId,
      shortcode: row.shortcode,
      post_url: row.postUrl,
      caption: row.caption,
      thumbnail_url: row.thumbnailUrl,
      is_video: row.isVideo,
      status: row.status,
      created_at: row.createdAt,
    };
  }

  private emitProgress(
    batchJobId: string,
    fetchedCount: number,
    totalLimit: number,
    status: string,
    errorMessage?: string,
  ) {
    this.emitter.emit('batch-progress', {
      batchJobId,
      fetchedCount,
      totalLimit,
      status,
      errorMessage,
    });
  }

  async process(job: Job<ScrapeBatchJobData>): Promise<void> {
    const batch = await this.batchRepo.findOne({
      where: { id: job.data.batchJobId },
    });
    // Guard: chain berhenti kalau user sudah pencet Stop — DB adalah source
    // of truth, bukan variable in-memory dari iterasi sebelumnya.
    if (!batch || batch.status !== 'running') return;

    const browsingAccount = await this.accountRepo.findOne({
      where: { id: batch.sourceAccountId },
    });
    if (!browsingAccount) {
      await this.batchRepo.update(batch.id, {
        status: 'failed',
        errorMessage: 'Akun browsing sumber tidak ditemukan',
      });
      this.emitProgress(
        batch.id,
        batch.fetchedCount,
        batch.totalLimit,
        'failed',
        'Akun browsing sumber tidak ditemukan',
      );
      return;
    }

    const existing = await this.scrapedRepo.find({
      where: { batchJobId: batch.id },
      select: ['shortcode'],
    });
    const excludeSet = new Set(existing.map((e) => e.shortcode));

    const quota = Math.min(
      batch.batchSize,
      batch.totalLimit - batch.fetchedCount,
    );

    let results: Awaited<ReturnType<typeof scrapeLatestInstagramPosts>> = [];
    try {
      results = await scrapeLatestInstagramPosts(
        browsingAccount,
        batch.targetUsername,
        quota,
        excludeSet,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal scrape Instagram';
      await this.batchRepo.update(batch.id, {
        status: 'failed',
        errorMessage: message,
      });
      this.emitProgress(
        batch.id,
        batch.fetchedCount,
        batch.totalLimit,
        'failed',
        message,
      );
      return;
    }

    // Batch PERTAMA kosong → kemungkinan besar cookie expired/username salah,
    // bukan "profil memang kosong". Batch LANJUTAN yang kosong wajar dianggap
    // "sudah habis" (lihat logic completed di bawah).
    if (results.length === 0 && batch.fetchedCount === 0) {
      const message =
        'Tidak ada post ditemukan pada percobaan pertama — cek cookie akun browsing atau username target';
      await this.batchRepo.update(batch.id, {
        status: 'failed',
        errorMessage: message,
      });
      this.emitProgress(
        batch.id,
        batch.fetchedCount,
        batch.totalLimit,
        'failed',
        message,
      );
      return;
    }

    let insertedCount = 0;
    for (const post of results) {
      try {
        const row = await this.scrapedRepo.save(
          this.scrapedRepo.create({
            batchJobId: batch.id,
            shortcode: post.shortcode,
            postUrl: `https://www.instagram.com/${post.isVideo ? 'reel' : 'p'}/${post.shortcode}/`,
            caption: post.caption,
            thumbnailUrl: post.thumbnailUrl,
            isVideo: post.isVideo,
            status: 'pending',
          }),
        );
        insertedCount += 1;
        this.emitter.emit('scraped-post', {
          batchJobId: batch.id,
          post: this.serializeForEmit(row),
        });
      } catch {
        // Unique constraint violation (duplikat shortcode) — abaikan diam-diam,
        // setara dengan onConflictDoNothing.
      }
    }

    const newFetchedCount = batch.fetchedCount + insertedCount;
    const isDone = results.length === 0 || newFetchedCount >= batch.totalLimit;
    const nextStatus = isDone ? 'completed' : 'running';

    await this.batchRepo.update(batch.id, {
      fetchedCount: newFetchedCount,
      status: nextStatus,
    });
    this.emitProgress(batch.id, newFetchedCount, batch.totalLimit, nextStatus);

    if (!isDone) {
      // Re-check status TERBARU dari DB (bukan variable `batch` di tangan) —
      // user bisa pencet Stop persis di antara insert dan titik ini.
      const latest = await this.batchRepo.findOne({ where: { id: batch.id } });
      if (latest?.status === 'running') {
        await this.queue.add(
          SCRAPE_BATCH_QUEUE_NAME,
          { batchJobId: batch.id },
          {},
        );
      }
    }
  }
}
