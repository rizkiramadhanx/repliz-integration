import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import { ScrapeBatchJobEntity } from './entities/scrape-batch-job.entity';
import { ScrapedPostEntity } from './entities/scraped-post.entity';
import { ScheduledPostEntity } from './entities/scheduled-post.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';
import { normalizeInstagramUsername } from './worker/username.util';
import { SCRAPE_BATCH_QUEUE_NAME } from './worker/scrape-batch-queue.constants';
import { SCHEDULED_POST_QUEUE_NAME } from './worker/scheduled-post-queue.constants';
import {
  GenerateDraftsFromScrapeDto,
  StartScrapeBatchDto,
} from './dto/scrape-batch.dto';
import { ScheduledPostsService } from './scheduled-posts.service';

@Injectable()
export class ScrapeBatchesService {
  constructor(
    @InjectRepository(ScrapeBatchJobEntity)
    private readonly batchRepo: Repository<ScrapeBatchJobEntity>,
    @InjectRepository(ScrapedPostEntity)
    private readonly scrapedRepo: Repository<ScrapedPostEntity>,
    @InjectRepository(ScheduledPostEntity)
    private readonly scheduledPostRepo: Repository<ScheduledPostEntity>,
    @InjectQueue(SCRAPE_BATCH_QUEUE_NAME)
    private readonly scrapeBatchQueue: Queue,
    @InjectQueue(SCHEDULED_POST_QUEUE_NAME)
    private readonly scheduledPostQueue: Queue,
    private readonly scheduledPostsService: ScheduledPostsService,
  ) {}

  private serializeBatch(row: ScrapeBatchJobEntity) {
    return {
      id: row.id,
      source_account_id: row.sourceAccountId,
      target_username: row.targetUsername,
      batch_size: row.batchSize,
      total_limit: row.totalLimit,
      scrape_mode: row.scrapeMode,
      fetched_count: row.fetchedCount,
      status: row.status,
      error_message: row.errorMessage,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeScraped(row: ScrapedPostEntity) {
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

  async startBatch(dto: StartScrapeBatchDto) {
    const targetUsername = normalizeInstagramUsername(dto.targetUsername);
    if (!targetUsername) {
      throw new BadRequestException('Username/link profil target tidak valid');
    }

    const row = this.batchRepo.create({
      sourceAccountId: dto.sourceAccountId,
      targetUsername,
      batchSize: 10,
      totalLimit: dto.totalLimit,
      scrapeMode: dto.scrapeMode ?? 'posts',
      fetchedCount: 0,
      status: 'running',
    });
    const saved = await this.batchRepo.save(row);

    await this.scrapeBatchQueue.add(SCRAPE_BATCH_QUEUE_NAME, {
      batchJobId: saved.id,
    });

    return this.serializeBatch(saved);
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.batchRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    };
    return { data: rows.map((r) => this.serializeBatch(r)), meta };
  }

  async findOne(id: string) {
    const row = await this.batchRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Scrape batch job not found');
    return this.serializeBatch(row);
  }

  async findScrapedPosts(batchJobId: string, pagination: PaginationDto) {
    const { page = 1, limit = 100 } = pagination;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.scrapedRepo.findAndCount({
      where: { batchJobId },
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });
    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    };
    return { data: rows.map((r) => this.serializeScraped(r)), meta };
  }

  async stop(id: string) {
    const row = await this.batchRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Scrape batch job not found');
    if (row.status !== 'running') {
      throw new BadRequestException(
        'Hanya batch berstatus running yang bisa dihentikan',
      );
    }
    await this.batchRepo.update(id, { status: 'stopped' });
    return this.findOne(id);
  }

  async generateDrafts(batchJobId: string, dto: GenerateDraftsFromScrapeDto) {
    const batchJob = await this.batchRepo.findOne({
      where: { id: batchJobId },
    });
    if (!batchJob) throw new NotFoundException('Scrape batch job not found');

    if (dto.gapMinutes < 15) {
      throw new BadRequestException('Jeda minimal 15 menit');
    }

    const rows = await this.scrapedRepo.find({
      where: { id: In(dto.scrapedPostIds), batchJobId },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = dto.scrapedPostIds
      .map((id) => byId.get(id))
      .filter(
        (r): r is ScrapedPostEntity =>
          !!r && r.status === 'pending' && !!r.thumbnailUrl,
      );

    if (ordered.length === 0) {
      throw new BadRequestException(
        'Tidak ada post valid untuk dijadikan draft (sudah dipakai atau tidak ditemukan)',
      );
    }

    const gapMs = dto.gapMinutes * 60_000;
    const pointers = new Map<string, number>();
    for (const accId of dto.targetAccountIds) {
      const last =
        await this.scheduledPostsService.getLastScheduledAtByAccount(accId);
      pointers.set(accId, Math.max(last?.getTime() ?? 0, Date.now()));
    }

    const created: ReturnType<typeof this.serializeScheduledDraft>[] = [];

    for (const post of ordered) {
      for (const accId of dto.targetAccountIds) {
        const nextAt = pointers.get(accId)! + gapMs;
        pointers.set(accId, nextAt);

        const draft = this.scheduledPostRepo.create({
          sourceAccountId: batchJob.sourceAccountId,
          sourceUrl: post.postUrl,
          caption: post.caption,
          mediaPath: null,
          thumbnailUrl: post.thumbnailUrl,
          isVideo: post.isVideo,
          targetAccountIds: [accId],
          scheduledAt: new Date(nextAt),
          status: 'scheduled',
        });
        const saved = await this.scheduledPostRepo.save(draft);

        const delayMs = nextAt - Date.now();
        const job = await this.scheduledPostQueue.add(
          SCHEDULED_POST_QUEUE_NAME,
          { scheduledPostId: saved.id },
          { delay: Math.max(delayMs, 0) },
        );
        await this.scheduledPostRepo.update(saved.id, { jobId: job.id });

        created.push(this.serializeScheduledDraft(saved));
      }
      await this.scrapedRepo.update(post.id, { status: 'used' });
    }

    return created;
  }

  private serializeScheduledDraft(row: ScheduledPostEntity) {
    return {
      id: row.id,
      target_account_ids: row.targetAccountIds,
      scheduled_at: row.scheduledAt,
      status: row.status,
    };
  }
}
