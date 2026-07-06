import { Injectable } from '@nestjs/common';
import { Client } from 'discord.js-selfbot-v13';
import { AccountEntity } from '../entities/account.entity';

@Injectable()
export class DiscordChecker {
  async check(
    account: AccountEntity,
  ): Promise<{ ok: boolean; error?: string }> {
    const token = account.credentials.token as string | undefined;
    if (!token) {
      return { ok: false, error: 'credentials.token tidak ditemukan' };
    }

    const client = new Client({
      checkUpdate: false,
    } as ConstructorParameters<typeof Client>[0]);

    try {
      const readyPromise = new Promise<void>((resolve, reject) => {
        client.once('ready', () => resolve());
        client.once('error', (err) => reject(err));
      });

      await Promise.race([
        client.login(token),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout menghubungi Discord')), 15000),
        ),
      ]);
      await Promise.race([
        readyPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout menunggu ready')), 15000),
        ),
      ]);

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      try {
        client.destroy();
      } catch {
        // ignore
      }
    }
  }
}
