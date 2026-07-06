import { Injectable } from '@nestjs/common';
import { AccountEntity } from '../entities/account.entity';
import { TelegramPublisher } from '../publishers/telegram.publisher';
import { DiscordChecker } from './discord.checker';
import { CookieSessionChecker } from './cookie-session.checker';

export type ConnectionCheckResult = {
  ok: boolean;
  error?: string;
  username?: string;
};

@Injectable()
export class ConnectionCheckService {
  constructor(
    private readonly telegramPublisher: TelegramPublisher,
    private readonly discordChecker: DiscordChecker,
    private readonly cookieSessionChecker: CookieSessionChecker,
  ) {}

  async check(account: AccountEntity): Promise<ConnectionCheckResult> {
    switch (account.type) {
      case 'telegram':
        return this.telegramPublisher.checkConnection(account);
      case 'discord':
        return this.discordChecker.check(account);
      case 'twitter':
      case 'facebook':
      case 'instagram':
        return this.cookieSessionChecker.check(
          account as AccountEntity & {
            type: 'twitter' | 'facebook' | 'instagram';
          },
        );
      default:
        return { ok: false, error: `Tipe akun tidak didukung: ${account.type}` };
    }
  }
}
