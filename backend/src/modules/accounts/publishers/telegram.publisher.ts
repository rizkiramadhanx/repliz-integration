import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { AccountEntity } from '../entities/account.entity';

export type TelegramPublishResult = {
  postUrl: string | null;
};

export type TelegramConnectionCheckResult = {
  ok: boolean;
  error?: string;
};

function buildPostUrl(
  chatId: string | number,
  messageId: number,
  chatUsername?: string,
): string | null {
  if (chatUsername) {
    return `https://t.me/${chatUsername}/${messageId}`;
  }
  const idStr = String(chatId);
  if (idStr.startsWith('-100')) {
    return `https://t.me/c/${idStr.slice(4)}/${messageId}`;
  }
  return null;
}

@Injectable()
export class TelegramPublisher {
  async publish(
    account: AccountEntity,
    options: { text: string; mediaPath?: string },
  ): Promise<TelegramPublishResult> {
    const botToken = account.credentials.botToken as string | undefined;
    const chatId = account.credentials.chatId as string | number | undefined;
    const chatUsername = account.credentials.chatUsername as
      | string
      | undefined;

    if (!botToken) {
      throw new Error(
        `Account ${account.id} (${account.label}) has no Telegram botToken configured`,
      );
    }
    if (!chatId) {
      throw new Error(
        `Account ${account.id} (${account.label}) has no Telegram chatId configured`,
      );
    }

    const bot = new TelegramBot(botToken);
    let message: { message_id: number };

    if (options.mediaPath) {
      const ext = options.mediaPath
        .slice(options.mediaPath.lastIndexOf('.'))
        .toLowerCase();
      const isVideo = ['.mp4', '.mov', '.mkv', '.webm'].includes(ext);
      message = isVideo
        ? await bot.sendVideo(chatId, options.mediaPath, {
            caption: options.text,
          })
        : await bot.sendPhoto(chatId, options.mediaPath, {
            caption: options.text,
          });
    } else {
      message = await bot.sendMessage(chatId, options.text);
    }

    return { postUrl: buildPostUrl(chatId, message.message_id, chatUsername) };
  }

  async checkConnection(
    account: AccountEntity,
  ): Promise<TelegramConnectionCheckResult> {
    const botToken = account.credentials.botToken as string | undefined;
    if (!botToken) {
      return { ok: false, error: 'credentials.botToken tidak ditemukan' };
    }

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getMe`,
        { signal: AbortSignal.timeout(10000) },
      );
      const body = (await res.json()) as {
        ok: boolean;
        description?: string;
      };
      if (!res.ok || !body.ok) {
        return { ok: false, error: body.description ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
