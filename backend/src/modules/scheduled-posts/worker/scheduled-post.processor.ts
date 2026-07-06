import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Job } from 'bullmq';
import { join } from 'path';
import { ScheduledPostEntity } from '../entities/scheduled-post.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { AutoPostTarget } from '../../auto-post-rules/entities/auto-post-rule.entity';
import { TelegramPublisher } from '../../accounts/publishers/telegram.publisher';
import { FacebookPublisher } from '../../accounts/publishers/facebook.publisher';
import { InstagramPublisher } from '../../accounts/publishers/instagram.publisher';
import { TwitterPublisher } from '../../accounts/publishers/twitter.publisher';
import { PostHistoryService } from '../../post-history/post-history.service';
import {
  downloadToTemp,
  deleteFile,
} from '../../auto-post-rules/worker/media.util';
import { scrapeInstagramPostByUrl } from '../../auto-post-rules/worker/instagram-scraper.util';
import { SCHEDULED_POST_QUEUE_NAME } from './scheduled-post-queue.constants';

export interface ScheduledPostJobData {
  scheduledPostId: string;
}

@Processor(SCHEDULED_POST_QUEUE_NAME, { concurrency: 1 })
export class ScheduledPostProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledPostProcessor.name);

  constructor(
    @InjectRepository(ScheduledPostEntity)
    private readonly repo: Repository<ScheduledPostEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    private readonly telegramPublisher: TelegramPublisher,
    private readonly facebookPublisher: FacebookPublisher,
    private readonly instagramPublisher: InstagramPublisher,
    private readonly twitterPublisher: TwitterPublisher,
    private readonly postHistoryService: PostHistoryService,
  ) {
    super();
  }

  private async publishToAccount(
    account: AccountEntity,
    options: { text: string; mediaPath?: string },
  ): Promise<string | null> {
    switch (account.type) {
      case 'facebook': {
        const result = await this.facebookPublisher.postToWall(
          account,
          options,
        );
        return result.postUrl;
      }
      case 'telegram': {
        const result = await this.telegramPublisher.publish(account, options);
        return result.postUrl;
      }
      case 'instagram': {
        const result = await this.instagramPublisher.post(account, options);
        return result.postUrl;
      }
      case 'twitter': {
        const result = await this.twitterPublisher.post(account, options);
        return result.postUrl;
      }
      default:
        throw new Error(
          `Platform ${account.type} tidak didukung untuk publish`,
        );
    }
  }

  async process(job: Job<ScheduledPostJobData>): Promise<void> {
    const row = await this.repo.findOne({
      where: { id: job.data.scheduledPostId },
    });
    // Guard: job BullMQ bisa saja tereksekusi meski row sudah dibatalkan
    // user lewat tombol Cancel — DB adalah source of truth, bukan job itu sendiri.
    if (!row || row.status !== 'scheduled') return;

    await this.repo.update(row.id, { status: 'publishing' });

    const targets = await this.accountRepo.find({
      where: { id: In(row.targetAccountIds) },
    });

    let mediaPath: string | undefined;
    let isTempMedia = false;
    let downloadError: string | undefined;

    try {
      if (row.mediaPath) {
        mediaPath = join(process.cwd(), 'uploads', row.mediaPath);
      } else if (row.sourceUrl && row.sourceAccountId) {
        try {
          const browsingAccount = await this.accountRepo.findOne({
            where: { id: row.sourceAccountId },
          });
          if (!browsingAccount) {
            throw new Error('Akun browsing sumber tidak ditemukan');
          }
          // Re-scrape fresh — thumbnailUrl lama (link CDN Instagram) kemungkinan
          // sudah expired karena draft ini bisa menunggu berjam-jam sebelum publish.
          const fresh = await scrapeInstagramPostByUrl(
            browsingAccount,
            row.sourceUrl,
          );
          if (!fresh)
            throw new Error('Gagal scrape ulang media dari Instagram');
          mediaPath = await downloadToTemp(
            fresh.mediaUrl,
            `${job.id}${fresh.isVideo ? '.mp4' : '.jpg'}`,
            { Referer: row.sourceUrl },
          );
          isTempMedia = true;
        } catch (err) {
          downloadError =
            err instanceof Error ? err.message : 'Gagal mengambil media';
        }
      }

      const hasMedia = !!(row.mediaPath || row.sourceUrl);
      const mediaType = !hasMedia ? 'text' : row.isVideo ? 'video' : 'photo';

      let anyFailed = false;
      for (const account of targets) {
        if (!account.isActive) continue;

        const historyRow = await this.postHistoryService.create({
          ruleId: null,
          ruleName: null,
          targetAccountId: account.id,
          platform: account.type as AutoPostTarget,
          mediaType,
          triggerSource: 'scheduled_post',
          sourceLabel: null,
          sourceUrl: row.sourceUrl,
          caption: row.caption,
          status: 'pending',
        });

        if (downloadError) {
          anyFailed = true;
          await this.postHistoryService.update(historyRow.id, {
            status: 'failed',
            errorMessage: downloadError,
          });
          continue;
        }

        try {
          const postUrl = await this.publishToAccount(account, {
            text: row.caption,
            mediaPath,
          });
          await this.postHistoryService.update(historyRow.id, {
            status: 'success',
            postUrl,
          });
        } catch (err) {
          anyFailed = true;
          await this.postHistoryService.update(historyRow.id, {
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      await this.repo.update(row.id, {
        status: anyFailed ? 'failed' : 'success',
        errorMessage: anyFailed ? 'Sebagian atau semua target gagal' : null,
      });
    } finally {
      if (mediaPath && isTempMedia) deleteFile(mediaPath);
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ScheduledPostJobData> | undefined, err: Error) {
    if (!job) return;
    this.logger.error(
      `Scheduled post job ${job.id} gagal: ${err instanceof Error ? err.message : err}`,
    );
    const row = await this.repo.findOne({
      where: { id: job.data.scheduledPostId },
    });
    if (row && row.status === 'publishing') {
      await this.repo.update(row.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
