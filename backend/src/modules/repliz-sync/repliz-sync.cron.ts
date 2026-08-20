import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReplizSyncService } from './repliz-sync.service';

@Injectable()
export class ReplizSyncCron {
  private readonly logger = new Logger(ReplizSyncCron.name);

  constructor(private readonly syncService: ReplizSyncService) {}

  // Berjalan tiap jam, tapi tiap kali hanya menjalankan rule yang jam
  // scrape-nya cocok (lihat scrapeTime pada rule). Ini menyebarkan beban:
  // tanpa itu semua rule di-scrape sekaligus dan durasinya menumpuk
  // sampai bertabrakan dengan jadwal terbit pertama.
  //
  // timeZone ditulis eksplisit karena main.ts memaksa process.env.TZ='UTC';
  // tanpa itu jam yang dibandingkan akan meleset 7 jam dari WIB.
  @Cron('0 * * * *', {
    name: 'repliz-sync-hourly',
    timeZone: 'Asia/Jakarta',
  })
  async handleDailySync(): Promise<void> {
    // Jam WIB saat ini — dihitung dari UTC karena proses berjalan di UTC.
    const currentHour = Number(
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      }).format(new Date()),
    );

    this.logger.log(`Sinkronisasi Repliz — rule dengan jam scrape ${currentHour}:00`);
    try {
      const results = await this.syncService.runAllActiveRules(currentHour);
      if (results.length === 0) {
        this.logger.log('Tidak ada rule terjadwal pada jam ini');
        return;
      }
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
