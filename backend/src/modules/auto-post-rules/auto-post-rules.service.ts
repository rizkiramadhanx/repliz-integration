import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoPostRuleEntity } from './entities/auto-post-rule.entity';
import {
  CreateAutoPostRuleDto,
  UpdateAutoPostRuleDto,
} from './dto/auto-post-rule.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';
import { AccountsService } from '../accounts/accounts.service';
import { DiscordObserverManager } from './worker/discord-observer.manager';

@Injectable()
export class AutoPostRulesService {
  constructor(
    @InjectRepository(AutoPostRuleEntity)
    private readonly ruleRepo: Repository<AutoPostRuleEntity>,
    private readonly accountsService: AccountsService,
    private readonly discordObserverManager: DiscordObserverManager,
  ) {}

  private serialize(rule: AutoPostRuleEntity) {
    return {
      id: rule.id,
      name: rule.name,
      discord_account_id: rule.discordAccountId,
      discord_channel_ids: rule.discordChannelIds,
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
    const targets = dto.targets ?? existing?.targets;
    if (!targets || targets.length === 0) {
      throw new BadRequestException('Pilih minimal satu target platform');
    }

    const discordChannelIds =
      dto.discordChannelIds ?? existing?.discordChannelIds;
    if (!discordChannelIds || discordChannelIds.length === 0) {
      throw new BadRequestException('discordChannelIds wajib diisi');
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

    await this.discordObserverManager.reloadForAccount(saved.discordAccountId);

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
      qb.innerJoin(
        'accounts',
        'discord_account',
        'discord_account.id = rule.discordAccountId',
      ).innerJoin(
        'account_delegations',
        'delegation',
        'delegation.accountId = discord_account.id AND delegation.userId = :userId',
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

  async getOneForUser(id: string, userId: string, isAdmin: boolean) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const hasAccess = await this.accountsService.hasAccess(
        rule.discordAccountId,
        userId,
      );
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
      const hasAccess = await this.accountsService.hasAccess(
        rule.discordAccountId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    this.validateRule(dto, rule);
    await this.assertAccessToReferencedAccounts(dto, rule, userId, isAdmin);

    const previousDiscordAccountId = rule.discordAccountId;
    Object.assign(rule, dto);
    const saved = await this.ruleRepo.save(rule);

    await this.discordObserverManager.reloadForAccount(
      previousDiscordAccountId,
    );
    if (saved.discordAccountId !== previousDiscordAccountId) {
      await this.discordObserverManager.reloadForAccount(
        saved.discordAccountId,
      );
    }

    return this.serialize(saved);
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const hasAccess = await this.accountsService.hasAccess(
        rule.discordAccountId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    await this.ruleRepo.delete(id);
    await this.discordObserverManager.reloadForAccount(rule.discordAccountId);

    return true;
  }

  async runNow(id: string, userId: string, isAdmin: boolean) {
    const rule = await this.findOrFail(id);

    if (!isAdmin) {
      const hasAccess = await this.accountsService.hasAccess(
        rule.discordAccountId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this rule');
      }
    }

    if (!rule.isActive) {
      throw new BadRequestException('Rule sedang nonaktif');
    }

    return this.discordObserverManager.runRuleNow(rule.id);
  }
}
