import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { AutoPostTarget } from '../entities/auto-post-rule.entity';
import { TelegramPublisher } from '../../accounts/publishers/telegram.publisher';
import { FacebookPublisher } from '../../accounts/publishers/facebook.publisher';
import { InstagramPublisher } from '../../accounts/publishers/instagram.publisher';
import { TwitterPublisher } from '../../accounts/publishers/twitter.publisher';
import { PostHistoryService } from '../../post-history/post-history.service';
import { PostHistoryMediaType } from '../../post-history/entities/post-history.entity';
import { downloadToTemp, deleteFile } from './media.util';
import { PUBLISH_QUEUE_NAME } from './publish-queue.constants';
import { PublishContext } from './publish-targets';

export interface PublishJobData {
  platform: AutoPostTarget;
  accountId: string;
  targetRef?: string;
  text: string;
  mediaUrl?: string;
  localMediaPath?: string;
  mediaType: PostHistoryMediaType;
  ruleId: string;
  ruleName: string;
  triggerSource: PublishContext['triggerSource'];
  sourceLabel?: string;
  sourceUrl?: string;
  postHistoryId?: string;
}

export interface PublishJobResult {
  postUrl: string | null;
}

function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.slice(pathname.lastIndexOf('.'));
    return ext.length > 1 && ext.length <= 5 ? ext : '';
  } catch {
    return '';
  }
}

@Processor(PUBLISH_QUEUE_NAME, { concurrency: 1 })
export class PublishQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishQueueProcessor.name);

  constructor(
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

  private async ensureHistoryRow(job: Job<PublishJobData>): Promise<string> {
    if (job.data.postHistoryId) return job.data.postHistoryId;

    const row = await this.postHistoryService.create({
      ruleId: job.data.ruleId,
      ruleName: job.data.ruleName,
      targetAccountId: job.data.accountId,
      platform: job.data.platform,
      targetRef: job.data.targetRef ?? null,
      mediaType: job.data.mediaType,
      triggerSource: job.data.triggerSource,
      sourceLabel: job.data.sourceLabel ?? null,
      sourceUrl: job.data.sourceUrl ?? null,
      caption: job.data.text,
      status: 'pending',
    });

    await job.updateData({ ...job.data, postHistoryId: row.id });
    return row.id;
  }

  async process(job: Job<PublishJobData>): Promise<PublishJobResult> {
    const historyId = await this.ensureHistoryRow(job);
    if (job.attemptsMade > 0) {
      await this.postHistoryService.update(historyId, {
        attempts: job.attemptsMade + 1,
      });
    }

    const account = await this.accountRepo.findOne({
      where: { id: job.data.accountId },
    });
    if (!account) {
      throw new Error(`Account ${job.data.accountId} not found`);
    }

    let mediaPath: string | undefined;
    let isTempMedia = false;
    try {
      if (job.data.localMediaPath) {
        mediaPath = job.data.localMediaPath;
      } else if (job.data.mediaUrl) {
        const isInstagramCdn = job.data.triggerSource.startsWith('instagram');
        mediaPath = await downloadToTemp(
          job.data.mediaUrl,
          `${job.id}${extensionFromUrl(job.data.mediaUrl)}`,
          isInstagramCdn && job.data.sourceUrl
            ? { Referer: job.data.sourceUrl }
            : undefined,
        );
        isTempMedia = true;
      }

      const options = { text: job.data.text, mediaPath };
      let postUrl: string | null = null;

      switch (job.data.platform) {
        case 'facebook':
          if (job.data.targetRef) {
            const result = await this.facebookPublisher.postToGroup(
              account,
              job.data.targetRef,
              options,
            );
            postUrl = result.postUrl;
          } else {
            const result = await this.facebookPublisher.postToWall(
              account,
              options,
            );
            postUrl = result.postUrl;
          }
          break;
        case 'telegram': {
          const result = await this.telegramPublisher.publish(account, {
            ...options,
            chatId: job.data.targetRef,
          });
          postUrl = result.postUrl;
          break;
        }
        case 'instagram': {
          const result = await this.instagramPublisher.post(account, options);
          postUrl = result.postUrl;
          break;
        }
        case 'twitter': {
          const result = await this.twitterPublisher.post(account, options);
          postUrl = result.postUrl;
          break;
        }
      }

      return { postUrl };
    } finally {
      if (mediaPath && isTempMedia) deleteFile(mediaPath);
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<PublishJobData, PublishJobResult>) {
    if (!job.data.postHistoryId) return;
    // updateIfStillPending: kalau row sudah ditandai 'failed' manual lewat
    // tombol "Hentikan Proses" sebelum job ini benar-benar selesai, jangan
    // ditimpa lagi jadi 'success'.
    await this.postHistoryService.updateIfStillPending(job.data.postHistoryId, {
      status: 'success',
      postUrl: job.returnvalue?.postUrl ?? null,
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<PublishJobData> | undefined, err: Error) {
    if (!job) return;
    this.logger.error(
      `Publish job ${job.id} gagal (attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}): ${err.message}`,
    );
    if (job.attemptsMade < (job.opts.attempts ?? 1)) return;
    if (!job.data.postHistoryId) return;
    await this.postHistoryService.updateIfStillPending(job.data.postHistoryId, {
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
