import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { join } from 'path';
import { AutoPostRuleEntity } from '../entities/auto-post-rule.entity';
import { PublishTargetsService } from './publish-targets';
import { applyCaptionRules } from './caption.util';
import { isValidCronExpression } from './cron.util';

const SCHEDULER_KEY_PREFIX = 'template-post-';
const CRON_TIMEZONE = 'Asia/Jakarta';

@Injectable()
export class TemplateObserverManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemplateObserverManager.name);
  private activeRuleIds = new Set<string>();

  constructor(
    @InjectRepository(AutoPostRuleEntity)
    private readonly ruleRepo: Repository<AutoPostRuleEntity>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly publishTargetsService: PublishTargetsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const rules = await this.ruleRepo.find({
      where: { triggerType: 'template', isActive: true },
    });
    for (const rule of rules) {
      await this.reloadForRule(rule.id);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopAll();
  }

  async reloadForRule(ruleId: string): Promise<void> {
    this.stopRule(ruleId);

    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule || rule.triggerType !== 'template' || !rule.isActive) {
      return;
    }
    if (!rule.cronExpression || !isValidCronExpression(rule.cronExpression)) {
      this.logger.error(
        `Rule ${ruleId} punya cron expression kosong/invalid: ${rule.cronExpression}`,
      );
      return;
    }

    const job = new CronJob(
      rule.cronExpression,
      () => {
        this.publishTemplate(ruleId).catch((err) => {
          this.logger.error(
            `Gagal publish template rule ${ruleId}: ${err instanceof Error ? err.message : err}`,
          );
        });
      },
      null,
      false,
      CRON_TIMEZONE,
    );

    const key = `${SCHEDULER_KEY_PREFIX}${ruleId}`;
    this.schedulerRegistry.addCronJob(key, job);
    job.start();
    this.activeRuleIds.add(ruleId);
  }

  stopRule(ruleId: string): void {
    const key = `${SCHEDULER_KEY_PREFIX}${ruleId}`;
    if (this.schedulerRegistry.doesExist('cron', key)) {
      this.schedulerRegistry.deleteCronJob(key);
    }
    this.activeRuleIds.delete(ruleId);
  }

  stopAll(): void {
    [...this.activeRuleIds].forEach((ruleId) => this.stopRule(ruleId));
  }

  async runRuleNow(ruleId: string): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new Error(`Auto post rule ${ruleId} not found`);
    }
    if (rule.triggerType !== 'template') {
      throw new Error(`Rule ${ruleId} bukan tipe template`);
    }
    await this.publishTemplate(ruleId, rule, 'template_run_now');
  }

  private async publishTemplate(
    ruleId: string,
    preloaded?: AutoPostRuleEntity,
    triggerSource:
      | 'template_scheduled'
      | 'template_run_now' = 'template_scheduled',
  ): Promise<void> {
    const rule =
      preloaded ?? (await this.ruleRepo.findOne({ where: { id: ruleId } }));
    if (!rule || !rule.templateMediaPath || !rule.templateMediaType) {
      this.logger.error(`Rule ${ruleId} tidak punya media template lengkap`);
      return;
    }

    const text = applyCaptionRules(rule.templateCaption ?? '', rule);

    await this.publishTargetsService.publishToTargets(
      rule,
      {
        text,
        localMediaPath: join(process.cwd(), 'uploads', rule.templateMediaPath),
        mediaType: rule.templateMediaType === 'video' ? 'video' : 'photo',
      },
      {
        ruleName: rule.name,
        triggerSource,
      },
    );
  }
}
