import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountsService } from './accounts.service';

/**
 * Cron: cek koneksi semua akun (Instagram/Twitter/Facebook/dll) setiap
 * 20 menit, supaya connection_status selalu ter-update tanpa perlu klik
 * manual satu-satu di halaman Account.
 */
@Injectable()
export class AccountsCron {
  private readonly logger = new Logger(AccountsCron.name);

  constructor(private readonly accountsService: AccountsService) {}

  @Cron('*/20 * * * *')
  async checkAllConnections(): Promise<void> {
    this.logger.log('Mulai cek koneksi semua akun');
    await this.accountsService.checkAllConnections();
    this.logger.log('Selesai cek koneksi semua akun');
  }
}
