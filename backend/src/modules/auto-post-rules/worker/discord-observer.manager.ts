import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, Message } from 'discord.js-selfbot-v13';
import { AccountEntity } from '../../accounts/entities/account.entity';
import {
  AutoPostMediaType,
  AutoPostRuleEntity,
} from '../entities/auto-post-rule.entity';
import { PublishTargetsService, PublishContext } from './publish-targets';
import { PostHistoryMediaType } from '../../post-history/entities/post-history.entity';
import { applyCaptionRules } from './caption.util';

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function getAttachmentMediaType(filename: string): AutoPostMediaType | null {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (IMAGE_EXTS.has(ext)) return 'image';
  return null;
}

function resolveChannelLabel(channel: { name?: string; id: string }): string {
  return channel.name ? `#${channel.name}` : channel.id;
}

const SAVE_MODE_DEBOUNCE_MS = 3000;

@Injectable()
export class DiscordObserverManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordObserverManager.name);
  private clients = new Map<string, Client>();
  private saveModeTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(AutoPostRuleEntity)
    private readonly ruleRepo: Repository<AutoPostRuleEntity>,
    private readonly publishTargetsService: PublishTargetsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const accountIds = await this.ruleRepo
      .createQueryBuilder('rule')
      .select('DISTINCT rule.discordAccountId', 'discordAccountId')
      .where('rule.isActive = true')
      .andWhere("rule.triggerType = 'discord_observer'")
      .getRawMany<{ discordAccountId: string }>();

    for (const { discordAccountId } of accountIds) {
      await this.reloadForAccount(discordAccountId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopAll();
  }

  async reloadForAccount(accountId: string): Promise<void> {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });
    if (!account || account.type !== 'discord') {
      await this.stopClient(accountId);
      return;
    }

    const rules = await this.ruleRepo.find({
      where: {
        discordAccountId: accountId,
        isActive: true,
        triggerType: 'discord_observer',
      },
    });

    if (rules.length === 0) {
      await this.stopClient(accountId);
      return;
    }

    // Client sudah aktif — listener membaca ulang rule dari DB tiap pesan masuk,
    // jadi tidak perlu restart koneksi hanya karena daftar rule berubah.
    if (this.clients.has(accountId)) {
      return;
    }

    await this.startClient(account);
  }

  private async startClient(account: AccountEntity): Promise<void> {
    const token = account.credentials.token as string | undefined;
    if (!token) {
      this.logger.error(
        `Account ${account.id} tidak punya credentials.token, observer tidak bisa dijalankan`,
      );
      return;
    }

    const client = new Client({
      checkUpdate: false,
    } as ConstructorParameters<typeof Client>[0]);

    client.on('ready', () => {
      this.logger.log(
        `Discord observer connected as ${client.user?.tag} (account ${account.id})`,
      );
    });

    client.on('messageCreate', (message) => {
      this.handleMessage(account.id, message).catch((err) => {
        this.logger.error(
          `Gagal memproses pesan Discord: ${err instanceof Error ? err.message : err}`,
        );
      });
    });

    client.on('error', (err) => {
      this.logger.error(
        `Discord client error (account ${account.id}): ${err instanceof Error ? err.message : err}`,
      );
    });

    this.clients.set(account.id, client);
    await client.login(token).catch((err) => {
      this.logger.error(
        `Login Discord gagal (account ${account.id}): ${err instanceof Error ? err.message : err}`,
      );
      this.clients.delete(account.id);
    });
  }

  private async handleMessage(
    discordAccountId: string,
    message: Message,
  ): Promise<void> {
    const rules = await this.ruleRepo.find({
      where: {
        discordAccountId,
        isActive: true,
        triggerType: 'discord_observer',
      },
    });

    const matchingRules = rules.filter((rule) =>
      (rule.discordChannelIds ?? []).includes(message.channel.id),
    );
    if (matchingRules.length === 0) return;

    const sourceLabel = resolveChannelLabel(message.channel);

    if (message.attachments.size === 0) {
      const textRules = matchingRules.filter((rule) =>
        rule.mediaTypes.includes('text'),
      );
      if (textRules.length === 0 || !message.content) return;

      for (const rule of textRules) {
        this.dispatch(rule, { text: message.content }, sourceLabel);
      }
      return;
    }

    for (const [, attachment] of message.attachments) {
      const mediaType = getAttachmentMediaType(attachment.name ?? '');
      if (!mediaType) continue;

      const rulesForMedia = matchingRules.filter((rule) =>
        rule.mediaTypes.includes(mediaType),
      );
      if (rulesForMedia.length === 0) continue;

      for (const rule of rulesForMedia) {
        this.dispatch(
          rule,
          {
            text: message.content,
            attachmentUrl: attachment.url,
            mediaType: mediaType === 'video' ? 'video' : 'photo',
          },
          sourceLabel,
        );
      }
    }
  }

  private dispatch(
    rule: AutoPostRuleEntity,
    payload: {
      text: string;
      attachmentUrl?: string;
      mediaType?: PostHistoryMediaType;
    },
    sourceLabel?: string,
  ): void {
    if (!rule.saveMode) {
      this.processAndPublish(
        rule,
        payload,
        'discord_observer',
        sourceLabel,
      ).catch((err) => {
        this.logger.error(
          `Gagal publish rule ${rule.id}: ${err instanceof Error ? err.message : err}`,
        );
      });
      return;
    }

    // save_mode: hanya pesan TERAKHIR dalam window debounce yang diproses —
    // pesan-pesan sebelumnya dalam window yang sama dibuang.
    const existingTimer = this.saveModeTimers.get(rule.id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.saveModeTimers.delete(rule.id);
      this.processAndPublish(
        rule,
        payload,
        'discord_observer',
        sourceLabel,
      ).catch((err) => {
        this.logger.error(
          `Gagal publish rule ${rule.id} (save_mode): ${err instanceof Error ? err.message : err}`,
        );
      });
    }, SAVE_MODE_DEBOUNCE_MS);

    this.saveModeTimers.set(rule.id, timer);
  }

  private async processAndPublish(
    rule: AutoPostRuleEntity,
    payload: {
      text: string;
      attachmentUrl?: string;
      mediaType?: PostHistoryMediaType;
    },
    triggerSource: PublishContext['triggerSource'],
    sourceLabel?: string,
  ): Promise<void> {
    const text = applyCaptionRules(payload.text ?? '', rule);

    await this.publishTargetsService.publishToTargets(
      rule,
      {
        text,
        mediaUrl: payload.attachmentUrl,
        mediaType: payload.mediaType ?? 'text',
      },
      { ruleName: rule.name, triggerSource, sourceLabel },
    );
  }

  async runRuleNow(ruleId: string): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new Error(`Auto post rule ${ruleId} not found`);
    }
    if (
      rule.triggerType !== 'discord_observer' ||
      !rule.discordAccountId ||
      !rule.discordChannelIds
    ) {
      throw new Error(`Rule ${ruleId} bukan tipe discord_observer`);
    }

    const client = this.clients.get(rule.discordAccountId);
    if (!client) {
      throw new Error(
        `Discord observer untuk account ${rule.discordAccountId} belum terkoneksi`,
      );
    }

    for (const channelId of rule.discordChannelIds) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !('messages' in channel)) continue;

      const messages = await channel.messages
        .fetch({ limit: 1 })
        .catch(() => null);
      const lastMessage = messages?.first();
      if (!lastMessage) continue;

      const sourceLabel = resolveChannelLabel(channel);

      if (lastMessage.attachments.size === 0) {
        if (rule.mediaTypes.includes('text') && lastMessage.content) {
          await this.processAndPublish(
            rule,
            { text: lastMessage.content },
            'discord_run_now',
            sourceLabel,
          );
        }
        continue;
      }

      for (const [, attachment] of lastMessage.attachments) {
        const mediaType = getAttachmentMediaType(attachment.name ?? '');
        if (!mediaType || !rule.mediaTypes.includes(mediaType)) continue;

        await this.processAndPublish(
          rule,
          {
            text: lastMessage.content,
            attachmentUrl: attachment.url,
            mediaType: mediaType === 'video' ? 'video' : 'photo',
          },
          'discord_run_now',
          sourceLabel,
        );
      }
    }
  }

  async stopClient(accountId: string): Promise<void> {
    const client = this.clients.get(accountId);
    if (!client) return;
    try {
      client.destroy();
    } catch {
      // ignore
    }
    this.clients.delete(accountId);
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      [...this.clients.keys()].map((id) => this.stopClient(id)),
    );
  }
}
