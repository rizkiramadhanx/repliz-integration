import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AutoPostRuleEntity } from '../entities/auto-post-rule.entity';
import { PostHistoryMediaType } from '../../post-history/entities/post-history.entity';
import { PublishJobData } from './publish-queue.processor';
import { PUBLISH_QUEUE_NAME } from './publish-queue.constants';

export type PublishOptions = {
  text: string;
  mediaUrl?: string;
  mediaType: PostHistoryMediaType;
};

export type PublishContext = {
  ruleName: string;
  triggerSource:
    | 'discord_observer'
    | 'discord_run_now'
    | 'instagram_observer'
    | 'instagram_run_now';
  sourceLabel?: string;
  sourceUrl?: string;
};

@Injectable()
export class PublishTargetsService {
  constructor(
    @InjectQueue(PUBLISH_QUEUE_NAME)
    private readonly publishQueue: Queue<PublishJobData>,
  ) {}

  async publishToTargets(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
  ): Promise<void> {
    const jobs: Promise<unknown>[] = [];

    const base = {
      text: options.text,
      mediaUrl: options.mediaUrl,
      mediaType: options.mediaType,
      ruleId: rule.id,
      ruleName: context.ruleName,
      triggerSource: context.triggerSource,
      sourceLabel: context.sourceLabel,
      sourceUrl: context.sourceUrl,
    };

    if (rule.targets.includes('facebook') && rule.facebookAccountId) {
      if (rule.facebookPostMode === 'group') {
        for (const groupId of rule.facebookGroupIds ?? []) {
          jobs.push(
            this.enqueue({
              ...base,
              platform: 'facebook',
              accountId: rule.facebookAccountId,
              targetRef: groupId,
            }),
          );
        }
      } else {
        jobs.push(
          this.enqueue({
            ...base,
            platform: 'facebook',
            accountId: rule.facebookAccountId,
          }),
        );
      }
    }

    if (rule.targets.includes('telegram') && rule.telegramAccountId) {
      const chatIds = rule.telegramChatIds ?? [];
      if (chatIds.length === 0) {
        jobs.push(
          this.enqueue({
            ...base,
            platform: 'telegram',
            accountId: rule.telegramAccountId,
          }),
        );
      } else {
        for (const chatId of chatIds) {
          jobs.push(
            this.enqueue({
              ...base,
              platform: 'telegram',
              accountId: rule.telegramAccountId,
              targetRef: chatId,
            }),
          );
        }
      }
    }

    if (rule.targets.includes('instagram') && rule.instagramAccountId) {
      jobs.push(
        this.enqueue({
          ...base,
          platform: 'instagram',
          accountId: rule.instagramAccountId,
        }),
      );
    }

    if (rule.targets.includes('twitter') && rule.twitterAccountId) {
      jobs.push(
        this.enqueue({
          ...base,
          platform: 'twitter',
          accountId: rule.twitterAccountId,
        }),
      );
    }

    await Promise.all(jobs);
  }

  private async enqueue(
    data: Omit<PublishJobData, 'postHistoryId'>,
  ): Promise<void> {
    await this.publishQueue.add(PUBLISH_QUEUE_NAME, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 24 * 60 * 60 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    });
  }

  async getQueueCounts(): Promise<{
    waiting: number;
    active: number;
    delayed: number;
    total: number;
  }> {
    const counts = await this.publishQueue.getJobCounts(
      'waiting',
      'active',
      'delayed',
    );
    const waiting = counts.waiting ?? 0;
    const active = counts.active ?? 0;
    const delayed = counts.delayed ?? 0;
    return { waiting, active, delayed, total: waiting + active + delayed };
  }
}
