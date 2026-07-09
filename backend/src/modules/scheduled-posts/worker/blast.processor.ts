import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { join } from 'path';
import { BlastJobEntity } from '../entities/blast-job.entity';
import { BlastGroupResultEntity } from '../entities/blast-group-result.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { FacebookPublisher } from '../../accounts/publishers/facebook.publisher';
import { PostHistoryService } from '../../post-history/post-history.service';
import { BLAST_QUEUE_NAME } from './blast-queue.constants';

export interface BlastJobData {
  blastJobId: string;
}

// Pesan rate-limit Facebook — muncul dalam bahasa Inggris ("We limit how
// often you can post, comment or do other things...") atau Indonesia
// ("Kami membatasi seberapa sering Anda dapat memposting...") tergantung
// locale akun. Kalau ini muncul, akun sedang kena spam-limit dan lanjut
// posting ke grup berikutnya cuma akan gagal terus + berisiko akun kena
// flag lebih parah. Blast harus berhenti total, bukan lanjut ke grup
// berikutnya seperti kegagalan biasa (mis. grup tidak ditemukan).
const FACEBOOK_RATE_LIMIT_PATTERN =
  /we limit how often you can post, comment or do other things|kami membatasi seberapa sering anda dapat memposting/i;

function isFacebookRateLimitError(message: string | null): boolean {
  return !!message && FACEBOOK_RATE_LIMIT_PATTERN.test(message);
}

@Processor(BLAST_QUEUE_NAME, { concurrency: 1 })
export class BlastProcessor extends WorkerHost {
  private readonly logger = new Logger(BlastProcessor.name);

  constructor(
    @InjectRepository(BlastJobEntity)
    private readonly blastRepo: Repository<BlastJobEntity>,
    @InjectRepository(BlastGroupResultEntity)
    private readonly resultRepo: Repository<BlastGroupResultEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectQueue(BLAST_QUEUE_NAME)
    private readonly queue: Queue,
    private readonly facebookPublisher: FacebookPublisher,
    private readonly postHistoryService: PostHistoryService,
    private readonly emitter: EventEmitter2,
  ) {
    super();
  }

  private emitProgress(
    blastJobId: string,
    currentGroupIndex: number,
    totalGroups: number,
    status: string,
    errorMessage?: string,
  ) {
    this.emitter.emit('blast-progress', {
      blastJobId,
      currentGroupIndex,
      totalGroups,
      status,
      errorMessage,
    });
  }

  async process(job: Job<BlastJobData>): Promise<void> {
    const blast = await this.blastRepo.findOne({
      where: { id: job.data.blastJobId },
    });
    // Guard: chain berhenti kalau user sudah pencet Stop — DB adalah source
    // of truth, bukan variable in-memory dari iterasi sebelumnya.
    if (!blast || blast.status !== 'running') return;

    const account = await this.accountRepo.findOne({
      where: { id: blast.facebookAccountId },
    });
    if (!account) {
      await this.blastRepo.update(blast.id, {
        status: 'failed',
        errorMessage: 'Akun Facebook tidak ditemukan',
      });
      this.emitProgress(
        blast.id,
        blast.currentGroupIndex,
        blast.groupIds.length,
        'failed',
        'Akun Facebook tidak ditemukan',
      );
      return;
    }

    const groupId = blast.groupIds[blast.currentGroupIndex];
    const mediaPath = blast.mediaPath
      ? join(process.cwd(), 'uploads', blast.mediaPath)
      : undefined;

    let resultStatus: 'success' | 'failed' = 'success';
    let resultError: string | null = null;
    try {
      await this.facebookPublisher.postToGroup(account, groupId, {
        text: blast.caption,
        mediaPath,
      });
    } catch (err) {
      resultStatus = 'failed';
      resultError = err instanceof Error ? err.message : 'Gagal posting ke grup';
      this.logger.error(
        `Blast job ${blast.id} gagal post ke grup ${groupId}: ${resultError}`,
      );
    }

    await this.resultRepo.save(
      this.resultRepo.create({
        blastJobId: blast.id,
        groupId,
        status: resultStatus,
        errorMessage: resultError,
      }),
    );
    this.emitter.emit('group-published', {
      blastJobId: blast.id,
      groupId,
      status: resultStatus,
      errorMessage: resultError,
    });

    const mediaType = blast.mediaPath
      ? /\.(mp4|mov|avi|mkv|webm)$/i.test(blast.mediaPath)
        ? 'video'
        : 'photo'
      : 'text';
    await this.postHistoryService.create({
      ruleId: null,
      ruleName: null,
      targetAccountId: blast.facebookAccountId,
      platform: 'facebook',
      targetRef: groupId,
      mediaType,
      triggerSource: 'blast',
      sourceLabel: `Grup ${groupId}`,
      sourceUrl: null,
      caption: blast.caption,
      postUrl: null,
      status: resultStatus === 'success' ? 'success' : 'failed',
      errorMessage: resultError,
    });

    const rateLimited = isFacebookRateLimitError(resultError);

    const nextIndex = blast.currentGroupIndex + 1;
    const isDone = nextIndex >= blast.groupIds.length;
    const nextStatus = rateLimited ? 'failed' : isDone ? 'completed' : 'running';
    const nextErrorMessage = rateLimited
      ? 'Blast dihentikan otomatis: akun Facebook kena rate limit (spam protection). Coba lagi nanti.'
      : null;

    await this.blastRepo.update(blast.id, {
      currentGroupIndex: nextIndex,
      status: nextStatus,
      errorMessage: nextErrorMessage,
    });
    this.emitProgress(
      blast.id,
      nextIndex,
      blast.groupIds.length,
      nextStatus,
      nextErrorMessage ?? undefined,
    );

    if (rateLimited) {
      this.logger.warn(
        `Blast job ${blast.id} dihentikan otomatis karena rate limit Facebook`,
      );
      return;
    }

    if (!isDone) {
      // Re-check status TERBARU dari DB (bukan variable `blast` di tangan) —
      // user bisa pencet Stop persis di antara update dan titik ini.
      const latest = await this.blastRepo.findOne({ where: { id: blast.id } });
      if (latest?.status === 'running') {
        await this.queue.add(
          BLAST_QUEUE_NAME,
          { blastJobId: blast.id },
          { delay: blast.gapMinutes * 60_000 },
        );
      }
    }
  }
}
