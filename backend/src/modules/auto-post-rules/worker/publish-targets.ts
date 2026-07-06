import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { AutoPostRuleEntity } from '../entities/auto-post-rule.entity';
import { TelegramPublisher } from '../../accounts/publishers/telegram.publisher';
import { FacebookPublisher } from '../../accounts/publishers/facebook.publisher';
import { InstagramPublisher } from '../../accounts/publishers/instagram.publisher';
import { TwitterPublisher } from '../../accounts/publishers/twitter.publisher';
import {
  PostHistoryService,
  CreatePostHistoryInput,
} from '../../post-history/post-history.service';
import { PostHistoryMediaType } from '../../post-history/entities/post-history.entity';

type PublishOptions = {
  text: string;
  mediaPath?: string;
};

export type PublishContext = {
  ruleName: string;
  triggerSource: 'discord_observer' | 'discord_run_now';
  sourceLabel?: string;
  sourceUrl?: string;
};

function resolveMediaType(mediaPath?: string): PostHistoryMediaType {
  if (!mediaPath) return 'text';
  const ext = mediaPath.slice(mediaPath.lastIndexOf('.')).toLowerCase();
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return videoExts.includes(ext) ? 'video' : 'photo';
}

@Injectable()
export class PublishTargetsService {
  private readonly logger = new Logger(PublishTargetsService.name);

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    private readonly telegramPublisher: TelegramPublisher,
    private readonly facebookPublisher: FacebookPublisher,
    private readonly instagramPublisher: InstagramPublisher,
    private readonly twitterPublisher: TwitterPublisher,
    private readonly postHistoryService: PostHistoryService,
  ) {}

  async publishToTargets(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
  ): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (rule.targets.includes('facebook') && rule.facebookAccountId) {
      tasks.push(this.publishFacebook(rule, options, context));
    }
    if (rule.targets.includes('telegram') && rule.telegramAccountId) {
      tasks.push(this.publishTelegram(rule, options, context));
    }
    if (rule.targets.includes('instagram') && rule.instagramAccountId) {
      tasks.push(this.publishInstagram(rule, options, context));
    }
    if (rule.targets.includes('twitter') && rule.twitterAccountId) {
      tasks.push(this.publishTwitter(rule, options, context));
    }

    const results = await Promise.allSettled(tasks);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Publish gagal untuk rule ${rule.id}: ${
            result.reason instanceof Error
              ? result.reason.message
              : result.reason
          }`,
        );
      }
    });
  }

  private async loadAccount(accountId: string): Promise<AccountEntity | null> {
    return this.accountRepo.findOne({ where: { id: accountId } });
  }

  private baseHistoryInput(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
    accountId: string | null,
  ): Omit<CreatePostHistoryInput, 'platform' | 'status' | 'targetRef'> {
    return {
      ruleId: rule.id,
      ruleName: context.ruleName,
      targetAccountId: accountId,
      mediaType: resolveMediaType(options.mediaPath),
      triggerSource: context.triggerSource,
      sourceLabel: context.sourceLabel ?? null,
      sourceUrl: context.sourceUrl ?? null,
      caption: options.text,
    };
  }

  private async publishFacebook(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
  ): Promise<void> {
    const account = await this.loadAccount(rule.facebookAccountId!);
    if (!account) {
      await this.postHistoryService.create({
        ...this.baseHistoryInput(
          rule,
          options,
          context,
          rule.facebookAccountId,
        ),
        platform: 'facebook',
        status: 'failed',
        errorMessage: `Facebook account ${rule.facebookAccountId} not found`,
      });
      throw new Error(`Facebook account ${rule.facebookAccountId} not found`);
    }

    if (rule.facebookPostMode === 'group') {
      const groupIds = rule.facebookGroupIds ?? [];
      for (const groupId of groupIds) {
        try {
          const result = await this.facebookPublisher.postToGroup(
            account,
            groupId,
            options,
          );
          await this.postHistoryService.create({
            ...this.baseHistoryInput(rule, options, context, account.id),
            platform: 'facebook',
            targetRef: groupId,
            status: 'success',
            postUrl: result.postUrl,
          });
        } catch (err) {
          await this.postHistoryService.create({
            ...this.baseHistoryInput(rule, options, context, account.id),
            platform: 'facebook',
            targetRef: groupId,
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
          });
          throw err;
        }
      }
    } else {
      try {
        const result = await this.facebookPublisher.postToWall(
          account,
          options,
        );
        await this.postHistoryService.create({
          ...this.baseHistoryInput(rule, options, context, account.id),
          platform: 'facebook',
          status: 'success',
          postUrl: result.postUrl,
        });
      } catch (err) {
        await this.postHistoryService.create({
          ...this.baseHistoryInput(rule, options, context, account.id),
          platform: 'facebook',
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }
  }

  private async publishTelegram(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
  ): Promise<void> {
    const account = await this.loadAccount(rule.telegramAccountId!);
    if (!account) {
      await this.postHistoryService.create({
        ...this.baseHistoryInput(
          rule,
          options,
          context,
          rule.telegramAccountId,
        ),
        platform: 'telegram',
        status: 'failed',
        errorMessage: `Telegram account ${rule.telegramAccountId} not found`,
      });
      throw new Error(`Telegram account ${rule.telegramAccountId} not found`);
    }

    const chatIds = rule.telegramChatIds ?? [];
    if (chatIds.length === 0) {
      try {
        const result = await this.telegramPublisher.publish(account, options);
        await this.postHistoryService.create({
          ...this.baseHistoryInput(rule, options, context, account.id),
          platform: 'telegram',
          status: 'success',
          postUrl: result.postUrl,
        });
      } catch (err) {
        await this.postHistoryService.create({
          ...this.baseHistoryInput(rule, options, context, account.id),
          platform: 'telegram',
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
      return;
    }

    for (const chatId of chatIds) {
      try {
        const result = await this.telegramPublisher.publish(account, {
          ...options,
          chatId,
        });
        await this.postHistoryService.create({
          ...this.baseHistoryInput(rule, options, context, account.id),
          platform: 'telegram',
          targetRef: chatId,
          status: 'success',
          postUrl: result.postUrl,
        });
      } catch (err) {
        await this.postHistoryService.create({
          ...this.baseHistoryInput(rule, options, context, account.id),
          platform: 'telegram',
          targetRef: chatId,
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }
  }

  private async publishInstagram(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
  ): Promise<void> {
    const account = await this.loadAccount(rule.instagramAccountId!);
    if (!account) {
      await this.postHistoryService.create({
        ...this.baseHistoryInput(
          rule,
          options,
          context,
          rule.instagramAccountId,
        ),
        platform: 'instagram',
        status: 'failed',
        errorMessage: `Instagram account ${rule.instagramAccountId} not found`,
      });
      throw new Error(`Instagram account ${rule.instagramAccountId} not found`);
    }

    try {
      const result = await this.instagramPublisher.post(account, options);
      await this.postHistoryService.create({
        ...this.baseHistoryInput(rule, options, context, account.id),
        platform: 'instagram',
        status: 'success',
        postUrl: result.postUrl,
      });
    } catch (err) {
      await this.postHistoryService.create({
        ...this.baseHistoryInput(rule, options, context, account.id),
        platform: 'instagram',
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }

  private async publishTwitter(
    rule: AutoPostRuleEntity,
    options: PublishOptions,
    context: PublishContext,
  ): Promise<void> {
    const account = await this.loadAccount(rule.twitterAccountId!);
    if (!account) {
      await this.postHistoryService.create({
        ...this.baseHistoryInput(rule, options, context, rule.twitterAccountId),
        platform: 'twitter',
        status: 'failed',
        errorMessage: `Twitter account ${rule.twitterAccountId} not found`,
      });
      throw new Error(`Twitter account ${rule.twitterAccountId} not found`);
    }

    try {
      const result = await this.twitterPublisher.post(account, options);
      await this.postHistoryService.create({
        ...this.baseHistoryInput(rule, options, context, account.id),
        platform: 'twitter',
        status: 'success',
        postUrl: result.postUrl,
      });
    } catch (err) {
      await this.postHistoryService.create({
        ...this.baseHistoryInput(rule, options, context, account.id),
        platform: 'twitter',
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }
}
