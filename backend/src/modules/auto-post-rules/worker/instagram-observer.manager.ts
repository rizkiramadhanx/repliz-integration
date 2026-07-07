import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { AutoPostRuleEntity } from '../entities/auto-post-rule.entity';
import { ProcessedInstagramPostEntity } from '../entities/processed-instagram-post.entity';
import { PublishTargetsService } from './publish-targets';
import { applyCaptionRules, stripKeywords } from './caption.util';
import {
  ScrapedInstagramPost,
  scrapeLatestInstagramPosts,
} from './instagram-scraper.util';

const SCHEDULER_KEY_PREFIX = 'instagram-observer-';
const RUN_NOW_SCRAPE_LIMIT = 1;
const OBSERVER_SCRAPE_LIMIT = 5;

@Injectable()
export class InstagramObserverManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstagramObserverManager.name);
  private intervalHandles = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(AutoPostRuleEntity)
    private readonly ruleRepo: Repository<AutoPostRuleEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(ProcessedInstagramPostEntity)
    private readonly processedRepo: Repository<ProcessedInstagramPostEntity>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly publishTargetsService: PublishTargetsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const rules = await this.ruleRepo.find({
      where: { triggerType: 'instagram_observer', isActive: true },
    });
    for (const rule of rules) {
      await this.reloadForRule(rule.id);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopAll();
  }

  async reloadForRule(ruleId: string): Promise<void> {
    this.stopRule(ruleId);

    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule || rule.triggerType !== 'instagram_observer' || !rule.isActive) {
      return;
    }

    const intervalMinutes = rule.instagramCheckIntervalMinutes ?? 60;
    const intervalMs = intervalMinutes * 60_000;

    const handle = setInterval(() => {
      this.checkRule(ruleId).catch((err) => {
        this.logger.error(
          `Gagal cek Instagram observer rule ${ruleId}: ${err instanceof Error ? err.message : err}`,
        );
      });
    }, intervalMs);

    const key = `${SCHEDULER_KEY_PREFIX}${ruleId}`;
    this.intervalHandles.set(ruleId, handle);
    this.schedulerRegistry.addInterval(key, handle);

    this.checkRule(ruleId).catch((err) => {
      this.logger.error(
        `Gagal cek Instagram observer rule ${ruleId} (initial run): ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  stopRule(ruleId: string): void {
    const key = `${SCHEDULER_KEY_PREFIX}${ruleId}`;
    if (this.schedulerRegistry.doesExist('interval', key)) {
      this.schedulerRegistry.deleteInterval(key);
    }
    this.intervalHandles.delete(ruleId);
  }

  async stopAll(): Promise<void> {
    [...this.intervalHandles.keys()].forEach((ruleId) => this.stopRule(ruleId));
  }

  async checkRule(ruleId: string): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule || rule.triggerType !== 'instagram_observer' || !rule.isActive) {
      return;
    }
    await this.processRule(rule, OBSERVER_SCRAPE_LIMIT);
  }

  async runRuleNow(ruleId: string, count?: number): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new Error(`Auto post rule ${ruleId} not found`);
    }
    if (rule.triggerType !== 'instagram_observer') {
      throw new Error(`Rule ${ruleId} bukan tipe instagram_observer`);
    }
    await this.processRule(
      rule,
      count ?? RUN_NOW_SCRAPE_LIMIT,
      'instagram_run_now',
    );
  }

  private async processRule(
    rule: AutoPostRuleEntity,
    scrapeLimit: number,
    triggerSource:
      | 'instagram_observer'
      | 'instagram_run_now' = 'instagram_observer',
  ): Promise<void> {
    if (!rule.instagramObserverAccountId) {
      this.logger.error(
        `Rule ${rule.id} tidak punya instagramObserverAccountId`,
      );
      return;
    }

    const browsingAccount = await this.accountRepo.findOne({
      where: { id: rule.instagramObserverAccountId },
    });
    if (!browsingAccount) {
      this.logger.error(
        `Instagram observer account ${rule.instagramObserverAccountId} not found`,
      );
      return;
    }

    const usernames = rule.instagramTargetUsernames ?? [];
    for (const username of usernames) {
      try {
        const posts = await scrapeLatestInstagramPosts(
          browsingAccount,
          username,
          scrapeLimit,
          undefined,
          rule.instagramScrapeMode,
        );

        let publishedCount = 0;
        for (const post of posts) {
          if (publishedCount >= scrapeLimit) break;

          const alreadyProcessed = await this.processedRepo.findOne({
            where: { ruleId: rule.id, sourceItemId: post.shortcode },
          });
          if (alreadyProcessed) continue;

          await this.publishPost(rule, username, post, triggerSource);

          await this.processedRepo.save(
            this.processedRepo.create({
              ruleId: rule.id,
              sourceItemId: post.shortcode,
            }),
          );
          publishedCount++;
        }
      } catch (err) {
        this.logger.error(
          `Gagal scrape Instagram @${username} untuk rule ${rule.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private async publishPost(
    rule: AutoPostRuleEntity,
    username: string,
    post: ScrapedInstagramPost,
    triggerSource: 'instagram_observer' | 'instagram_run_now',
  ): Promise<void> {
    const strippedCaption = rule.includeOriginalCaption
      ? stripKeywords(post.caption, rule.excludeKeywords)
      : '';
    const text = applyCaptionRules(strippedCaption, rule);

    await this.publishTargetsService.publishToTargets(
      rule,
      {
        text,
        mediaUrl: post.mediaUrl,
        mediaType: post.isVideo ? 'video' : 'photo',
      },
      {
        ruleName: rule.name,
        triggerSource,
        sourceLabel: `@${username}`,
        sourceUrl: `https://www.instagram.com/${username}/${post.isVideo ? 'reel' : 'p'}/${post.shortcode}/`,
      },
    );
  }
}
