import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis-client.provider';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AccountEntity, ConnectionStatus } from './entities/account.entity';

const REDIS_KEY_PREFIX = 'account:last-connection-status:';
// Status lama disimpan cukup lama supaya restart backend tidak membuat
// semua akun terlihat "berubah" dan memicu alert palsu — TTL panjang,
// bukan permanen, supaya key basi (akun sudah dihapus) tidak numpuk selamanya.
const REDIS_KEY_TTL_SECONDS = 60 * 60 * 24 * 30;

// Alert dikirim hanya saat status berubah dari 'connected' ke status lain
// (edge-triggered), bukan setiap kali cron menemukan akun masih putus —
// mencegah spam WA tiap 10 menit selama akun belum di-reconnect manual.
const ALERTABLE_STATUSES: ConnectionStatus[] = ['error', 'disconnected'];

@Injectable()
export class ConnectionAlertService {
  private readonly logger = new Logger(ConnectionAlertService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  private redisKey(accountId: string): string {
    return `${REDIS_KEY_PREFIX}${accountId}`;
  }

  private getTargetPhone(): string | undefined {
    const targetPhone = this.configService.get<string>(
      'whatsapp.alertTargetPhone',
    );
    if (!targetPhone) {
      this.logger.warn('WA_ALERT_TARGET_PHONE belum dikonfigurasi');
    }
    return targetPhone;
  }

  async notifyIfStatusChanged(
    account: AccountEntity,
    newStatus: ConnectionStatus,
  ): Promise<void> {
    const key = this.redisKey(account.id);
    const previousStatus = await this.redis.get(key);

    await this.redis.set(key, newStatus, 'EX', REDIS_KEY_TTL_SECONDS);

    const justBroke =
      previousStatus === 'connected' && ALERTABLE_STATUSES.includes(newStatus);
    if (!justBroke) return;

    const targetPhone = this.getTargetPhone();
    if (!targetPhone) return;

    const message = [
      `⚠️ Akun ${account.label} (${account.type}) terputus.`,
      account.connectionError ? `Error: ${account.connectionError}` : null,
      `Dicek pada: ${new Date().toLocaleString('id-ID')}`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.whatsappService.sendMessage(targetPhone, message);
  }

  // Ringkasan status seluruh akun, dikirim manual lewat tombol di halaman
  // Account — beda dari notifyIfStatusChanged yang hanya kirim saat status
  // berubah, ini selalu kirim kondisi terkini apapun statusnya.
  async sendStatusSummary(accounts: AccountEntity[]): Promise<boolean> {
    const targetPhone = this.getTargetPhone();
    if (!targetPhone) return false;

    const lines = accounts.map((account) => {
      const icon = account.connectionStatus === 'connected' ? '✅' : '⚠️';
      return `${icon} ${account.label} (${account.type}): ${account.connectionStatus}`;
    });

    const message = [
      `📋 Ringkasan status akun (${accounts.length} akun)`,
      `Dicek pada: ${new Date().toLocaleString('id-ID')}`,
      '',
      ...lines,
    ].join('\n');

    return this.whatsappService.sendMessage(targetPhone, message);
  }
}
