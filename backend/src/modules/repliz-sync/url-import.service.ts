import { Injectable, Logger } from '@nestjs/common';
import { ReplizService } from '../repliz/repliz.service';
import {
  assertPublicBaseUrlUsable,
  buildPublicUrl,
  downloadToPublicDir,
  REPLIZ_MEDIA_SUBDIR,
} from './worker/public-media.util';

export type ImportUrlResult = {
  url: string;
  ok: boolean;
  scheduleId?: string;
  scheduledAt?: string;
  caption?: string;
  error?: string;
};

export type ImportUrlsParams = {
  urls: string[];
  replizAccountId: string;
  startTime?: string;
  intervalMinutes?: number;
};

type ResolvedMedia = {
  mediaUrl: string;
  caption: string;
  isVideo: boolean;
};

// Jumlah konten maksimum per hari, sama seperti aturan pada rule otomatis:
// tanpa batas ini rangkaian akan melewati tengah malam dan tumpah ke tanggal
// berikutnya di tengah jalan.
const MAX_SLOTS_PER_DAY = 24;

@Injectable()
export class UrlImportService {
  private readonly logger = new Logger(UrlImportService.name);

  constructor(private readonly replizService: ReplizService) {}

  // URL dinormalkan lebih dulu supaya bentuk yang berbeda-beda (dengan query
  // pelacakan, tanpa https, atau berupa tautan pendek) tetap dikenali.
  private detectPlatform(url: string): 'tiktok' | 'instagram' | 'facebook' | null {
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/instagram\.com/i.test(url)) return 'instagram';
    if (/facebook\.com/i.test(url)) return 'facebook';
    return null;
  }

  private async resolveMedia(url: string): Promise<ResolvedMedia> {
    const platform = this.detectPlatform(url);
    if (!platform) {
      throw new Error('URL bukan TikTok, Instagram, atau Facebook');
    }

    // require dipakai agar kegagalan memuat modul pihak ketiga tidak
    // menggagalkan seluruh modul saat paketnya belum terpasang.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const scraper = require('ruhend-scraper') as {
      ttdl: (url: string) => Promise<Record<string, string>>;
      igdl: (url: string) => Promise<string[]>;
      fbdl: (url: string) => Promise<string[]>;
    };

    const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('timeout mengambil media')), 60000),
        ),
      ]);

    // Layanan downloader (tikwm) kerap memutus koneksi di tengah respons
    // ("Premature close") atau mengembalikan data kosong. Kegagalannya
    // sementara: URL yang sama biasanya berhasil pada percobaan berikutnya,
    // jadi dicoba ulang beberapa kali sebelum dianggap gagal.
    const withRetry = async <T>(
      factory: () => Promise<T>,
      attempts = 3,
    ): Promise<T> => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          return await withTimeout(factory());
        } catch (error) {
          lastError = error;
          if (attempt < attempts) {
            // Jeda bertambah tiap percobaan agar tidak membebani layanan
            // yang sedang bermasalah.
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
          }
        }
      }
      throw lastError;
    };

    if (platform === 'tiktok') {
      const data = await withRetry(() => scraper.ttdl(url));
      // `video` (H.264) diutamakan daripada `video_hd` yang memakai HEVC —
      // HEVC tidak didukung banyak pemutar dan berisiko ditolak Repliz.
      // `video_wm` tidak dipakai karena memuat watermark.
      const mediaUrl = data?.video || data?.video_hd;
      if (!mediaUrl) throw new Error('URL video TikTok tidak ditemukan');
      return { mediaUrl, caption: data?.title ?? '', isVideo: true };
    }

    const urls = await withRetry(() =>
      platform === 'instagram' ? scraper.igdl(url) : scraper.fbdl(url),
    );
    const mediaUrl = Array.isArray(urls)
      ? urls.find((item) => typeof item === 'string' && /^https?:/i.test(item))
      : null;
    if (!mediaUrl) throw new Error('URL media tidak ditemukan');

    // Downloader Instagram/Facebook tidak mengembalikan caption, jadi
    // dibiarkan kosong — pengguna bisa mengisinya sendiri di Repliz.
    return {
      mediaUrl,
      caption: '',
      isVideo: !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(mediaUrl),
    };
  }

  // Menghitung berapa konten yang SUDAH terjadwal per tanggal pada akun
  // Repliz tujuan. Tanpa ini, batas harian hanya berlaku dalam satu impor —
  // dua impor berturut-turut ke akun yang sama akan menumpuk pada hari yang
  // sama dan melewati batas.
  private async countScheduledPerDay(
    replizAccountId: string,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    try {
      const list = await this.replizService.listSchedules({
        page: 1,
        limit: 200,
        accountIds: [replizAccountId],
      });

      for (const item of list.docs ?? []) {
        const date = this.dateKey(new Date(item.scheduleAt));
        counts.set(date, (counts.get(date) ?? 0) + 1);
      }
    } catch (error) {
      // Gagal membaca jadwal bukan alasan membatalkan impor: batas harian
      // tetap berlaku untuk konten dalam impor ini.
      const message =
        error instanceof Error ? error.message : 'gagal membaca jadwal';
      this.logger.warn(`Tidak bisa membaca jadwal akun: ${message}`);
    }
    return counts;
  }

  // Tanggal lokal (bukan UTC) supaya pengelompokannya sesuai hari yang
  // dilihat pengguna.
  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private scheduleTimeAt(
    startTime: string,
    intervalMinutes: number,
    slotIndex: number,
  ): Date {
    const [hour, minute] = startTime.split(':').map((v) => Number(v));
    const intervalMs = intervalMinutes * 60 * 1000;

    const startMinuteOfDay = (hour || 0) * 60 + (minute || 0);
    const slotsBeforeMidnight = Math.max(
      1,
      Math.ceil((24 * 60 - startMinuteOfDay) / intervalMinutes),
    );
    const slotsPerDay = Math.min(MAX_SLOTS_PER_DAY, slotsBeforeMidnight);

    const dayOffset = Math.floor(slotIndex / slotsPerDay);
    const slotInDay = slotIndex % slotsPerDay;

    const start = new Date();
    start.setHours(hour || 0, minute || 0, 0, 0);

    // Jam mulai yang sudah lewat digeser ke hari berikutnya pada jam yang
    // sama, bukan ke "sekarang + interval", supaya jam terbitnya konsisten.
    const baseDayOffset = start.getTime() <= Date.now() ? 1 : 0;
    start.setDate(start.getDate() + baseDayOffset + dayOffset);

    return new Date(start.getTime() + slotInDay * intervalMs);
  }

  async importUrls(params: ImportUrlsParams): Promise<ImportUrlResult[]> {
    const {
      urls,
      replizAccountId,
      startTime = '06:00',
      intervalMinutes = 60,
    } = params;

    // Dicek lebih dulu supaya tidak mengunduh apa pun bila URL medianya
    // nanti tidak bisa dijangkau server Repliz.
    assertPublicBaseUrlUsable();

    const results: ImportUrlResult[] = [];

    // Slot yang sudah terpakai di akun tujuan ikut dihitung, sehingga batas
    // harian berlaku PER AKUN — bukan sekadar per impor.
    const usedPerDay = await this.countScheduledPerDay(replizAccountId);
    let slotIndex = 0;

    for (const url of urls) {
      try {
        const media = await this.resolveMedia(url);

        // URL yang sudah menunjuk direktori media sendiri tidak diunduh
        // ulang agar tidak menggandakan berkas.
        const publicUrl = media.mediaUrl.includes(
          `/uploads/${REPLIZ_MEDIA_SUBDIR}/`,
        )
          ? media.mediaUrl
          : buildPublicUrl(
              (await downloadToPublicDir(media.mediaUrl)).publicPath,
            );

        // Geser slot selama tanggalnya sudah penuh di akun tujuan.
        let scheduledAt = this.scheduleTimeAt(
          startTime,
          intervalMinutes,
          slotIndex,
        );
        while (
          (usedPerDay.get(this.dateKey(scheduledAt)) ?? 0) >= MAX_SLOTS_PER_DAY
        ) {
          slotIndex += 1;
          scheduledAt = this.scheduleTimeAt(
            startTime,
            intervalMinutes,
            slotIndex,
          );
        }

        const dateKey = this.dateKey(scheduledAt);
        usedPerDay.set(dateKey, (usedPerDay.get(dateKey) ?? 0) + 1);
        slotIndex += 1;

        const created = await this.replizService.createSchedule({
          accountId: replizAccountId,
          title: '',
          description: media.caption,
          type: media.isVideo ? 'video' : 'image',
          medias: [
            { url: publicUrl, type: media.isVideo ? 'video' : 'image' },
          ],
          scheduleAt: scheduledAt.toISOString(),
        });

        results.push({
          url,
          ok: true,
          scheduleId: created.scheduleId,
          scheduledAt: scheduledAt.toISOString(),
          caption: media.caption,
        });
      } catch (error) {
        // Satu URL gagal tidak menghentikan sisanya; hasilnya dilaporkan
        // per URL supaya pengguna tahu mana yang perlu diulang.
        const message =
          error instanceof Error ? error.message : 'Gagal memproses URL';
        this.logger.error(`Gagal memproses ${url}: ${message}`);
        results.push({ url, ok: false, error: message });
      }
    }

    return results;
  }
}
