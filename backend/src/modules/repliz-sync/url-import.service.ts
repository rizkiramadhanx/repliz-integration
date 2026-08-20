import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReplizService } from '../repliz/repliz.service';
import { UrlImportHistoryEntity } from './entities/url-import-history.entity';
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
  // URL ini pernah diimpor ke akun yang sama sebelumnya. Sekadar penanda —
  // kontennya tetap diproses, karena mengulang bisa saja disengaja.
  duplicate?: boolean;
  previousScheduledAt?: string;
};

export type ImportUrlsParams = {
  urls: string[];
  replizAccountId: string;
  // Tanggal mulai (YYYY-MM-DD). Bila kosong, dipakai hari ini — dan digeser
  // ke besok bila jam mulainya sudah lewat.
  startDate?: string;
  startTime?: string;
  intervalMinutes?: number;
  // Minta Repliz menambahkan musik otomatis. Berguna untuk akun TikTok:
  // sebagian platform menekan jangkauan video tanpa trek musik terdaftar.
  autoAddMusic?: boolean;
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

// Batas URL per satu kali impor. Tiap URL memerlukan unduhan media dan satu
// panggilan ke Repliz, jadi ratusan URL sekaligus membuat request menggantung
// sangat lama dan sulit dipantau. Sisanya bisa diimpor pada batch berikutnya.
const MAX_URLS_PER_IMPORT = 100;

@Injectable()
export class UrlImportService {
  private readonly logger = new Logger(UrlImportService.name);

  constructor(
    private readonly replizService: ReplizService,
    @InjectRepository(UrlImportHistoryEntity)
    private readonly historyRepo: Repository<UrlImportHistoryEntity>,
  ) {}

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
      // Panggilan langsung ke API tikwm sebagai jalur utama: `ttdl` membungkus
      // API yang sama, tapi kegagalannya sering berupa error internal yang
      // tidak bisa dibedakan dari masalah jaringan. Memanggil langsung membuat
      // status HTTP dan kode respons terbaca, sehingga retry lebih tepat
      // sasaran dan pesan errornya lebih jelas.
      try {
        const data = await withRetry(() => this.fetchTiktokDirect(url));
        if (data) return data;
      } catch {
        // Jatuh ke library sebagai cadangan.
      }

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

  // Memanggil API tikwm langsung. Dipisah dari library supaya kegagalannya
  // bisa dibedakan: HTTP non-200 berarti layanan/jaringan bermasalah,
  // sedangkan code != 0 berarti videonya yang tidak bisa diambil.
  private async fetchTiktokDirect(url: string): Promise<ResolvedMedia | null> {
    const endpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const response = await fetch(endpoint, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`tikwm membalas HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      code?: number;
      msg?: string;
      data?: {
        play?: string;
        hdplay?: string;
        title?: string;
        content_desc?: string | string[];
      };
    };

    if (body?.code !== 0 || !body?.data) {
      throw new Error(body?.msg || 'tikwm tidak mengembalikan data');
    }

    // `play` (H.264 tanpa watermark) diutamakan daripada `hdplay` yang
    // memakai HEVC — HEVC tidak didukung banyak pemutar dan berisiko
    // ditolak Repliz.
    const mediaUrl = body.data.play || body.data.hdplay;
    if (!mediaUrl) return null;

    return {
      mediaUrl: mediaUrl.startsWith('http')
        ? mediaUrl
        : `https://www.tikwm.com${mediaUrl}`,
      // Sebagian video mengisi `content_desc` tapi tidak `title` (atau
      // sebaliknya), jadi keduanya dipakai bergantian. `content_desc` bisa
      // berupa array (potongan teks) maupun string, jadi bentuknya
      // dinormalkan lebih dulu. Video tanpa caption sama sekali memang ada —
      // hasilnya kosong, bukan kegagalan.
      caption: this.normalizeCaption(body.data.title, body.data.content_desc),
      isVideo: true,
    };
  }

  private normalizeCaption(
    title?: string,
    contentDesc?: string | string[],
  ): string {
    const fromTitle = typeof title === 'string' ? title.trim() : '';
    if (fromTitle) return fromTitle;

    if (Array.isArray(contentDesc)) {
      return contentDesc
        .filter((part) => typeof part === 'string')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return typeof contentDesc === 'string' ? contentDesc.trim() : '';
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
      // Diambil berhalaman: satu akun bisa punya ratusan jadwal, dan
      // membaca hanya halaman pertama membuat hitungan slot terpakai
      // meleset sehingga batas harian bocor.
      const MAX_PAGES = 10;
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const list = await this.replizService.listSchedules({
          page,
          limit: 200,
          accountIds: [replizAccountId],
        });

        for (const item of list.docs ?? []) {
          const date = this.dateKey(new Date(item.scheduleAt));
          counts.set(date, (counts.get(date) ?? 0) + 1);
        }

        if (!list.hasNextPage) break;
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
    startDate?: string,
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

    // Tanggal mulai eksplisit dipakai apa adanya; tanpa itu dipakai hari ini.
    // Dibangun lewat setFullYear agar tetap waktu LOKAL — `new Date('YYYY-MM-DD')`
    // diperlakukan sebagai UTC dan bisa meleset satu hari.
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const [year, month, day] = startDate.split('-').map((v) => Number(v));
      start.setFullYear(year, month - 1, day);
    }
    start.setHours(hour || 0, minute || 0, 0, 0);

    // Hanya digeser ke besok bila tanggalnya TIDAK ditentukan pengguna:
    // kalau pengguna memilih tanggal, keinginannya harus dihormati apa adanya.
    const baseDayOffset =
      !startDate && start.getTime() <= Date.now() ? 1 : 0;
    start.setDate(start.getDate() + baseDayOffset + dayOffset);

    return new Date(start.getTime() + slotInDay * intervalMs);
  }

  async importUrls(params: ImportUrlsParams): Promise<ImportUrlResult[]> {
    const {
      urls,
      replizAccountId,
      startDate,
      startTime = '06:00',
      intervalMinutes = 60,
      autoAddMusic = false,
    } = params;

    // Dicek lebih dulu supaya tidak mengunduh apa pun bila URL medianya
    // nanti tidak bisa dijangkau server Repliz.
    assertPublicBaseUrlUsable();

    if (urls.length > MAX_URLS_PER_IMPORT) {
      throw new Error(
        `Terlalu banyak URL (${urls.length}). Maksimal ${MAX_URLS_PER_IMPORT} per sekali impor — bagi menjadi beberapa batch.`,
      );
    }

    const results: ImportUrlResult[] = [];

    // Riwayat dibaca sekali di awal, bukan per URL, supaya tidak ada query
    // berulang untuk daftar yang bisa mencapai ratusan.
    const previous = await this.historyRepo.find({
      where: { replizAccountId, url: In(urls) },
      order: { createdAt: 'DESC' },
    });
    const previousByUrl = new Map<string, UrlImportHistoryEntity>();
    for (const row of previous) {
      if (!previousByUrl.has(row.url)) previousByUrl.set(row.url, row);
    }

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
          startDate,
        );
        while (
          (usedPerDay.get(this.dateKey(scheduledAt)) ?? 0) >= MAX_SLOTS_PER_DAY
        ) {
          slotIndex += 1;
          scheduledAt = this.scheduleTimeAt(
            startTime,
            intervalMinutes,
            slotIndex,
            startDate,
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
          // Musik hanya relevan untuk video; menyalakannya pada gambar
          // tidak berpengaruh dan berpotensi ditolak platform.
          ...(autoAddMusic && media.isVideo
            ? { additionalInfo: { isAutoAddMusic: true } }
            : {}),
        });

        // Dicatat setelah Repliz menerima, bukan sebelum: mencatat lebih awal
        // akan menandai URL sebagai "pernah diimpor" walau penjadwalannya
        // gagal.
        await this.historyRepo
          .save(
            this.historyRepo.create({
              url,
              replizAccountId,
              replizScheduleId: created.scheduleId,
              scheduledAt,
            }),
          )
          .catch(() => undefined);

        const before = previousByUrl.get(url);
        results.push({
          url,
          ok: true,
          scheduleId: created.scheduleId,
          scheduledAt: scheduledAt.toISOString(),
          caption: media.caption,
          duplicate: Boolean(before),
          previousScheduledAt: before?.scheduledAt?.toISOString(),
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
