import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReplizSyncService } from './repliz-sync.service';

@Injectable()
export class ReplizSyncCron {
  private readonly logger = new Logger(ReplizSyncCron.name);

  constructor(private readonly syncService: ReplizSyncService) {}

  // Jam 05:00 WIB. main.ts memaksa process.env.TZ = 'UTC', jadi timeZone
  // ditulis eksplisit — tanpa itu cron akan jalan 05:00 UTC (12:00 WIB).
  @Cron('0 5 * * *', {
    name: 'repliz-sync-daily',
    timeZone: 'Asia/Jakarta',
  })
  async handleDailySync(): Promise<void> {
    this.logger.log('Mulai sinkronisasi harian Repliz');
    try {
      const results = await this.syncService.runAllActiveRules();
      const totalScheduled = results.reduce(
        (sum, result) => sum + result.scheduled,
        0,
      );
      this.logger.log(
        `Sinkronisasi selesai: ${results.length} rule, ${totalScheduled} konten terjadwal`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal sinkronisasi';
      this.logger.error(`Sinkronisasi harian gagal: ${message}`);
    }
  }
}
