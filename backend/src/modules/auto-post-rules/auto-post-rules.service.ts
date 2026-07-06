import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoPostRuleEntity } from './entities/auto-post-rule.entity';
import {
  CreateAutoPostRuleDto,
  MIN_INSTAGRAM_OBSERVER_INTERVAL_MINUTES,
  UpdateAutoPostRuleDto,
} from './dto/auto-post-rule.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';
import { AccountsService } from '../accounts/accounts.service';
import { DiscordObserverManager } from './worker/discord-observer.manager';
import { InstagramObserverManager } from './worker/instagram-observer.manager';
import { PostHistoryService } from '../post-history/post-history.service';

@Injectable()
export class AutoPostRulesService {
  constructor(
    @InjectRepository(AutoPostRuleEntity)
    private readonly ruleRepo: Repository<AutoPostRuleEntity>,
    private readonly accountsService: AccountsService,
    private readonly discordObserverManager: DiscordObserverManager,
    private readonly instagramObserverManager: InstagramObserverManager,
    private readonly postHistoryService: PostHistoryService,
  ) {}

  private serialize(rule: AutoPostRuleEntity) {
    return {
      id: rule.id,
      name: rule.name,
      trigger_type: rule.triggerType,
      discord_account_id: rule.discordAccountId,
      discord_channel_ids: rule.discordChannelIds,
      instagram_observer_account_id: rule.instagramObserverAccountId,
      instagram_target_usernames: rule.instagramTargetUsernames,
      exclude_keywords: rule.excludeKeywords,
      include_original_caption: rule.includeOriginalCaption,
      instagram_check_interval_minutes: rule.instagramCheckIntervalMinutes,
      targets: rule.targets,
      facebook_account_id: rule.facebookAccountId,
      facebook_post_mode: rule.facebookPostMode,
      facebook_group_ids: rule.facebookGroupIds,
      instagram_account_id: rule.instagramAccountId,
      twitter_account_id: rule.twitterAccountId,
      telegram_account_id: rule.telegramAccountId,
      telegram_chat_ids: rule.telegramChatIds,
      media_types: rule.mediaTypes,
      caption_prefix: rule.captionPrefix,
      caption_suffix: rule.captionSuffix,
      caption_replacements: rule.captionReplacements,
      save_mode: rule.saveMode,
      is_active: rule.isActive,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
  }

  private validateRule(
    dto: CreateAutoPostRuleDto | UpdateAutoPostRuleDto,
    existing?: AutoPostRuleEntity,
  ): void {
    const triggerType = dto.triggerType ?? existing?.triggerType;
    if (!triggerType) {
      throw new BadRequestException('triggerType wajib diisi');
    }

    if (triggerType === 'discord_observer') {
      const discordAccountId =
        dto.discordAccountId ?? existing?.discordAccountId;
      if (!discordAccountId) {
        throw new BadRequestException(
          'discordAccountId wajib diisi untuk trigger discord_observer',
        );
      }
      const discordChannelIds =
        dto.discordChannelIds ?? existing?.discordChannelIds;
      if (!discordChannelIds || discordChannelIds.length === 0) {
        throw new BadRequestException(
          'discordChannelIds wajib diisi untuk trigger discord_observer',
        );
      }
    }

    if (triggerType === 'instagram_observer') {
      const instagramObserverAccountId =
        dto.instagramObserverAccountId ?? existing?.instagramObserverAccountId;
      if (!instagramObserverAccountId) {
        throw new BadRequestException(
          'instagramObserverAccountId wajib diisi untuk trigger instagram_observer',
        );
      }
      const instagramTargetUsernames =
        dto.instagramTargetUsernames ?? existing?.instagramTargetUsernames;
      if (!instagramTargetUsernames || instagramTargetUsernames.length === 0) {
        throw new BadRequestException(
          'instagramTargetUsernames wajib diisi untuk trigger instagram_observer',
        );
      }
      const instagramCheckIntervalMinutes =
        dto.instagramCheckIntervalMinutes ??
        existing?.instagramCheckIntervalMinutes;
      if (
        !instagramCheckIntervalMinutes ||
        instagramCheckIntervalMinutes < MIN_INSTAGRAM_OBSERVER_INTERVAL_MINUTES
      ) {
        throw new BadRequestException(
          `instagramCheckIntervalMinutes minimal ${MIN_INSTAGRAM_OBSERVER_INTERVAL_MINUTES} menit untuk menghindari rate-limit/ban dari Instagram`,
        );
      }
    }

    const targets = dto.targets ?? existing?.targets;
    if (!targets || targets.length === 0) {
      throw new BadRequestException('Pilih minimal satu target platform');
    }

    const mediaTypes = dto.mediaTypes ?? existing?.mediaTypes;
    if (!mediaTypes || mediaTypes.length === 0) {
      throw new BadRequestException('Pilih minimal satu tipe media');
    }

    if (targets.includes('facebook')) {
      const facebookAccountId =
        dto.facebookAccountId ?? existing?.facebookAccountId;
      if (!facebookAccountId) {
        throw new BadRequestException(
          'facebookAccountId wajib diisi saat target facebook dipilih',
        );
      }
      const facebookPostMode =
        dto.facebookPostMode ?? existing?.facebookPostMode;
      if (!facebookPostMode) {
        throw new BadRequestException(
          'facebookPostMode wajib diisi (wall atau group) saat target facebook dipilih',
        );
      }
      if (facebookPostMode === 'group') {
        const facebookGroupIds =
          dto.facebookGroupIds ?? existing?.facebookGroupIds;
        if (!facebookGroupIds || facebookGroupIds.length === 0) {
          throw new BadRequestException(
            'facebookGroupIds wajib diisi saat facebookPostMode adalah group',
          );
        }
      }
    }

    if (targets.includes('telegram')) {
      const telegramAccountId =
        dto.telegramAccountId ?? existing?.telegramAccountId;
      if (!telegramAccountId) {
        throw new BadRequestException(
          'telegramAccountId wajib diisi saat target telegram dipilih',
        );
      }
    }

    if (targets.includes('instagram')) {
      const instagramAccountId =
        dto.instagramAccountId ?? existing?.instagramAccountId;
      if (!instagramAccountId) {
        throw new BadRequestException(
          'instagramAccountId wajib diisi saat target instagram dipilih',
        );
      }
    }

    if (targets.includes('twitter')) {
      const twitterAccountId =
        dto.twitterAccountId ?? existing?.twitterAccountId;
      if (!twitterAccountId) {
        throw new BadRequestException(
          'twitterAccountId wajib diisi saat target twitter dipilih',
        );
      }
    }
  }

  private async assertAccessToReferencedAccounts(
    dto: CreateAutoPostRuleDto | UpdateAutoPostRuleDto,
    existing: AutoPostRuleEntity | undefined,
    userId: string,
    isAdmin: boolean,
  ): Promise<void> {
    if (isAdmin) return;

    const accountIds = [
      dto.discordAccountId ?? existing?.discordAccountId,
      dto.instagramObserverAccountId ?? existing?.instagramObserverAccountId,
      dto.facebookAccountId ?? existing?.facebookAccountId,
      dto.instagramAccountId ?? existing?.instagramAccountId,
      dto.twitterAccountId ?? existing?.twitterAccountId,
      dto.telegramAccountId ?? existing?.telegramAccountId,
    ].filter((id): id is string => !!id);

    for (const accountId of accountIds) {
      const hasAccess = await this.accountsService.hasAccess(accountId, userId);
      if (!hasAccess) {
        throw new ForbiddenException(
          `You do not have access to account ${accountId}`,
        );
      }
    }
  }

  private async reloadObserver(rule: AutoPostRuleEntity): Promise<void> {
    if (rule.triggerType === 'discord_observer') {
      if (rule.discordAccountId) {
        await this.discordObserverManager.reloadForAccount(
          rule.discordAccountId,
        );
      }
    } else {
      await this.instagramObserverManager.reloadForRule(rule.id);
    }
  }

  async create(dto: CreateAutoPostRuleDto, userId: string, isAdmin: boolean) {
    this.validateRule(dto);
    await this.assertAccessToReferencedAccounts(
      dto,
      undefined,
      userId,
      isAdmin,
    );

    const rule = this.ruleRepo.create(dto);
    const saved = await this.ruleRepo.save(rule);

    await this.reloadObserver(saved);

    return this.serialize(saved);
  }

  async listForUser(
    userId: string,
    isAdmin: boolean,
    pagination: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.ruleRepo
      .createQueryBuilder('rule')
      .orderBy('rule.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (!isAdmin) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM account_delegations delegation
          WHERE delegation.user_id = :userId
          AND delegation.account_id IN (
            rule.discord_account_id,
            rule.instagram_observer_account_id
          )
        )`,
        { userId },
      );
    }

    const [rules, total] = await qb.getManyAndCount();

    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    };

    return { data: rules.map((r) => this.serialize(r)), meta };
  }

  private async findOrFail(id: string): Promise<AutoPostRuleEntity> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Auto post rule not found');
    return rule;
  }

  private sourceAccountId(rule: AutoPostRuleEntity): string | null {
    return rule.triggerType === 'discord_observer'
      ? rule.discordAccountId
      : rule.instagramObserverAccountId;
  }

  async getOneForUser(id: string, userId: string, isAdmin: boolean) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const sourceAccountId = this.sourceAccountId(rule);
      const hasAccess = sourceAccountId
        ? await this.accountsService.hasAccess(sourceAccountId, userId)
        : false;
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    return this.serialize(rule);
  }

  async update(
    id: string,
    dto: UpdateAutoPostRuleDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const sourceAccountId = this.sourceAccountId(rule);
      const hasAccess = sourceAccountId
        ? await this.accountsService.hasAccess(sourceAccountId, userId)
        : false;
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    this.validateRule(dto, rule);
    await this.assertAccessToReferencedAccounts(dto, rule, userId, isAdmin);

    const previousTriggerType = rule.triggerType;
    const previousDiscordAccountId = rule.discordAccountId;
    Object.assign(rule, dto);
    const saved = await this.ruleRepo.save(rule);

    // Reload observer lama kalau trigger type atau akun Discord sumbernya berubah,
    // supaya listener/interval lama benar-benar berhenti (bukan cuma yang baru didaftarkan).
    if (
      previousTriggerType === 'discord_observer' &&
      previousDiscordAccountId &&
      (previousTriggerType !== saved.triggerType ||
        previousDiscordAccountId !== saved.discordAccountId)
    ) {
      await this.discordObserverManager.reloadForAccount(
        previousDiscordAccountId,
      );
    }
    if (
      previousTriggerType === 'instagram_observer' &&
      previousTriggerType !== saved.triggerType
    ) {
      this.instagramObserverManager.stopRule(saved.id);
    }

    await this.reloadObserver(saved);

    return this.serialize(saved);
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const sourceAccountId = this.sourceAccountId(rule);
      const hasAccess = sourceAccountId
        ? await this.accountsService.hasAccess(sourceAccountId, userId)
        : false;
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    await this.ruleRepo.delete(id);

    if (rule.triggerType === 'discord_observer' && rule.discordAccountId) {
      await this.discordObserverManager.reloadForAccount(rule.discordAccountId);
    } else {
      this.instagramObserverManager.stopRule(rule.id);
    }

    return true;
  }

  async runNow(id: string, userId: string, isAdmin: boolean) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const sourceAccountId = this.sourceAccountId(rule);
      const hasAccess = sourceAccountId
        ? await this.accountsService.hasAccess(sourceAccountId, userId)
        : false;
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    if (!rule.isActive) {
      throw new BadRequestException('Rule sedang nonaktif');
    }

    const stillRunning = await this.postHistoryService.hasPendingForRule(
      rule.id,
    );
    if (stillRunning) {
      throw new ConflictException(
        'Aturan ini masih berjalan, tunggu beberapa saat sebelum menjalankan lagi',
      );
    }

    if (rule.triggerType === 'discord_observer') {
      return this.discordObserverManager.runRuleNow(rule.id);
    }
    return this.instagramObserverManager.runRuleNow(rule.id);
  }
}
