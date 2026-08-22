import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReplizService } from '../repliz/repliz.service';
import { UrlImportHistoryEntity } from './entities/url-import-history.entity';
import { UrlImportJobEntity } from './entities/url-import-job.entity';
import { fetchViaAndaraz } from './worker/andaraz.util';
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
  // Diisi saat impor dijalankan sebagai job latar. Dipakai untuk menautkan
  // tiap baris riwayat ke batch-nya sekaligus memperbarui kemajuan.
  jobId?: string;
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
  // Semua media dalam satu postingan. Carousel/slideshow menghasilkan
  // beberapa berkas; mengambil satu saja membuat sisanya hilang.
  mediaUrls: string[];
  caption: string;
  isVideo: boolean;
};

// Jumlah konten maksimum per hari, sama seperti aturan pada rule otomatis:
// tanpa batas ini rangkaian akan melewati tengah malam dan tumpah ke tanggal
// berikutnya di tengah jalan.
const MAX_SLOTS_PER_DAY = 24;

// Batas URL per satu kali impor. Tiap URL mengunduh media ke disk VPS, jadi
// batas ini menjaga ruang penyimpanan sekaligus memori proses.
const MAX_URLS_PER_IMPORT = 2000;

// Jeda antar panggilan ke Repliz. Repliz belum mendokumentasikan batas laju,
// dan pada pengujian 180 POST beruntun tidak ada yang ditolak — tapi ribuan
// URL adalah beban yang jauh berbeda, jadi laju sengaja ditahan daripada
// menunggu sampai ditolak dan kehilangan sebagian jadwal.
const REPLIZ_CALL_DELAY_MS = 400;

// Jeda tambahan setiap satu batch selesai, memberi ruang bagi Repliz dan
// bagi I/O disk untuk menyusul.
const BATCH_SIZE = 25;
const BATCH_PAUSE_MS = 2000;

@Injectable()
export class UrlImportService implements OnModuleInit {
  private readonly logger = new Logger(UrlImportService.name);

  constructor(
    private readonly replizService: ReplizService,
    @InjectRepository(UrlImportHistoryEntity)
    private readonly historyRepo: Repository<UrlImportHistoryEntity>,
    @InjectRepository(UrlImportJobEntity)
    private readonly jobRepo: Repository<UrlImportJobEntity>,
  ) {}

  // Job berjalan di memori proses, jadi restart server (deploy, crash)
  // meninggalkannya berstatus 'running' selamanya. Ditandai gagal saat start
  // supaya tidak terlihat menggantung, dan URL-nya bisa diulang lewat
  // tombol "Ulangi gagal".
  async onModuleInit(): Promise<void> {
    const stale = await this.jobRepo
      .find({ where: { status: 'running' } })
      .catch(() => []);
    if (stale.length === 0) return;

    for (const job of stale) {
      await this.jobRepo
        .update(job.id, {
          status: 'failed',
          message:
            'Server dimulai ulang saat impor berjalan. URL yang belum diproses bisa diulang.',
          finishedAt: new Date(),
        })
        .catch(() => undefined);
    }
    this.logger.warn(
      `${stale.length} job impor ditandai gagal karena server dimulai ulang`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Membuat job lalu menjalankannya TANPA ditunggu. Impor ribuan URL bisa
  // memakan puluhan menit — jauh melewati batas 100 detik Cloudflare — jadi
  // pemanggil hanya menerima jobId dan memantau kemajuannya lewat riwayat.
  async startImportJob(
    params: ImportUrlsParams & { replizAccountName?: string },
  ): Promise<UrlImportJobEntity> {
    // Divalidasi sebelum job dibuat supaya kesalahan konfigurasi langsung
    // terlihat sebagai error request, bukan sebagai job yang gagal diam-diam.
    assertPublicBaseUrlUsable();

    if (params.urls.length === 0) {
      throw new Error('Tidak ada URL yang bisa diimpor');
    }
    if (params.urls.length > MAX_URLS_PER_IMPORT) {
      throw new Error(
        `Terlalu banyak URL (${params.urls.length}). Maksimal ${MAX_URLS_PER_IMPORT} per sekali impor.`,
      );
    }

    const job = await this.jobRepo.save(
      this.jobRepo.create({
        replizAccountId: params.replizAccountId,
        replizAccountName: params.replizAccountName ?? null,
        status: 'running',
        total: params.urls.length,
        processed: 0,
        success: 0,
        failed: 0,
        startDate: params.startDate ?? null,
        startTime: params.startTime ?? '06:00',
        intervalMinutes: params.intervalMinutes ?? 60,
        autoAddMusic: params.autoAddMusic ?? false,
        urls: params.urls,
      }),
    );

    void this.runImportJob(job.id, params);
    return job;
  }

  private async runImportJob(
    jobId: string,
    params: ImportUrlsParams,
  ): Promise<void> {
    try {
      const results = await this.importUrls({ ...params, jobId });
      const failed = results.filter((r) => !r.ok).length;
      await this.jobRepo.update(jobId, {
        status: 'done',
        processed: results.length,
        success: results.length - failed,
        failed,
        finishedAt: new Date(),
        message:
          failed > 0
            ? `${results.length - failed} berhasil, ${failed} gagal`
            : `${results.length} berhasil`,
      });
    } catch (error) {
      // Kegagalan di sini berarti seluruh job berhenti (mis. konfigurasi
      // media publik tidak valid), bukan sekadar satu URL bermasalah.
      const message =
        error instanceof Error ? error.message : 'Job impor gagal';
      this.logger.error(`Job impor ${jobId} gagal: ${message}`);
      await this.jobRepo
        .update(jobId, {
          status: 'failed',
          message,
          finishedAt: new Date(),
        })
        .catch(() => undefined);
    }
  }

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
      igdl2: (url: string) => Promise<unknown>;
      fbdl2: (url: string) => Promise<unknown>;
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

    // Andaraz adalah jalur UTAMA untuk ketiga platform: satu layanan berbayar
    // dengan kunci API, alih-alih rangkaian layanan gratis yang gampang
    // memblokir IP server. Bila gagal, jalur lama tetap dipakai sebagai
    // cadangan — tidak ada layanan pihak ketiga yang bisa diandalkan 100%.
    const viaAndaraz = await fetchViaAndaraz(url, platform);
    if (viaAndaraz) return viaAndaraz;

    if (platform === 'tiktok') {
      // Panggilan langsung ke API tikwm sebagai cadangan pertama: `ttdl` membungkus
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
      const images = Array.isArray((data as { images?: string[] })?.images)
        ? ((data as { images?: string[] }).images ?? []).filter(
            (item) => typeof item === 'string' && /^https?:/i.test(item),
          )
        : [];
      if (images.length > 0) {
        return { mediaUrls: images, caption: data?.title ?? '', isVideo: false };
      }

      const mediaUrl = data?.video || data?.video_hd;
      if (!mediaUrl) throw new Error('URL video TikTok tidak ditemukan');
      return { mediaUrls: [mediaUrl], caption: data?.title ?? '', isVideo: true };
    }

    // Dua downloader dengan layanan hulu BERBEDA: `igdl`/`fbdl` memakai
    // videodropper.app, sedangkan `igdl2`/`fbdl2` memakai rapidcdn.app.
    // Keduanya layanan pihak ketiga gratis yang bisa memblokir IP tertentu —
    // pernah terjadi videodropper menolak IP VPS ("Premature close") padahal
    // dari jaringan lain berhasil. Karena itu kegagalan satu jalur harus
    // dicoba ulang lewat jalur satunya, bukan langsung dianggap gagal.
    const primary = () =>
      platform === 'instagram' ? scraper.igdl(url) : scraper.fbdl(url);
    const secondary = () =>
      platform === 'instagram' ? scraper.igdl2(url) : scraper.fbdl2(url);

    let mediaUrls: string[] = [];
    let firstError: unknown;
    for (const [index, resolver] of [primary, secondary].entries()) {
      try {
        mediaUrls = this.extractMediaUrls(await withRetry(resolver));
        if (mediaUrls.length > 0) break;
      } catch (error) {
        if (index === 0) firstError = error;
      }
    }

    if (mediaUrls.length === 0) {
      // Error jalur pertama yang dilaporkan: lebih informatif untuk
      // membedakan pemblokiran hulu dari postingan privat/terhapus.
      if (firstError) throw firstError;
      throw new Error('URL media tidak ditemukan');
    }

    // Tipe ditentukan dari media PERTAMA: satu postingan Instagram tidak
    // mencampur foto dan video dalam satu carousel.
    const isVideo = !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(mediaUrls[0]);

    // Downloader Instagram/Facebook tidak mengembalikan caption, jadi
    // dibiarkan kosong — pengguna bisa mengisinya sendiri di Repliz.
    return { mediaUrls, caption: '', isVideo };
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
        // Slideshow foto TikTok: berisi daftar gambar, dan `play` boleh jadi
        // hanya video hasil rendering slideshow-nya.
        images?: string[];
      };
    };

    if (body?.code !== 0 || !body?.data) {
      throw new Error(body?.msg || 'tikwm tidak mengembalikan data');
    }

    // Slideshow foto ditangani lebih dulu: `play` pada konten seperti ini
    // berisi video hasil rendering, bukan konten aslinya. Mengirim video itu
    // membuat postingan kehilangan bentuk aslinya sebagai kumpulan foto.
    const images = Array.isArray(body.data.images)
      ? body.data.images.filter(
          (item) => typeof item === 'string' && /^https?:/i.test(item),
        )
      : [];
    if (images.length > 0) {
      return {
        mediaUrls: images,
        caption: this.normalizeCaption(
          body.data.title,
          body.data.content_desc,
        ),
        isVideo: false,
      };
    }

    // `play` (H.264 tanpa watermark) diutamakan daripada `hdplay` yang
    // memakai HEVC — HEVC tidak didukung banyak pemutar dan berisiko
    // ditolak Repliz.
    const mediaUrl = body.data.play || body.data.hdplay;
    if (!mediaUrl) return null;

    return {
      mediaUrls: [
        mediaUrl.startsWith('http')
          ? mediaUrl
          : `https://www.tikwm.com${mediaUrl}`,
      ],
      // Sebagian video mengisi `content_desc` tapi tidak `title` (atau
      // sebaliknya), jadi keduanya dipakai bergantian. `content_desc` bisa
      // berupa array (potongan teks) maupun string, jadi bentuknya
      // dinormalkan lebih dulu. Video tanpa caption sama sekali memang ada —
      // hasilnya kosong, bukan kegagalan.
      caption: this.normalizeCaption(body.data.title, body.data.content_desc),
      isVideo: true,
    };
  }

  // Menyeragamkan dua bentuk balasan downloader menjadi daftar URL.
  // `igdl`/`fbdl` mengembalikan array string, sedangkan `igdl2`/`fbdl2`
  // mengembalikan { status, data: [{ url, thumbnail }] }. Bidang `thumbnail`
  // sengaja diabaikan: itu gambar pratinjau, bukan medianya.
  private extractMediaUrls(raw: unknown): string[] {
    const isUsable = (item: unknown): item is string =>
      typeof item === 'string' && /^https?:/i.test(item);

    // Duplikat dibuang sambil mempertahankan urutan: `igdl2` mengembalikan
    // satu entri per varian kualitas, sehingga carousel 3 foto bisa terbaca
    // sebagai 9 media dan terkirim sebagai album berisi foto yang sama
    // berulang tiga kali.
    const unique = (items: string[]): string[] => [...new Set(items)];

    if (Array.isArray(raw)) return unique(raw.filter(isUsable));

    const data = (raw as { data?: unknown })?.data;
    if (Array.isArray(data)) {
      return unique(
        data
          .map((item) =>
            isUsable(item) ? item : (item as { url?: unknown })?.url,
          )
          .filter(isUsable),
      );
    }

    return [];
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
      jobId,
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
      where: { replizAccountId, url: In(urls), status: 'scheduled' },
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
    let processed = 0;

    for (const url of urls) {
      try {
        const media = await this.resolveMedia(url);

        // URL yang sudah menunjuk direktori media sendiri tidak diunduh
        // ulang agar tidak menggandakan berkas.
        // Semua media diunduh, bukan hanya yang pertama: carousel Instagram
        // bisa berisi banyak foto, dan mengambil satu saja membuat sisanya
        // hilang tanpa pemberitahuan.
        const publicUrls: string[] = [];
        for (const source of media.mediaUrls) {
          publicUrls.push(
            source.includes(`/uploads/${REPLIZ_MEDIA_SUBDIR}/`)
              ? source
              : buildPublicUrl((await downloadToPublicDir(source)).publicPath),
          );
        }

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

        // Lebih dari satu media berarti carousel; Repliz menyebutnya `album`.
        const mediaType = media.isVideo ? 'video' : 'image';
        const postType = publicUrls.length > 1 ? 'album' : mediaType;

        const created = await this.replizService.createSchedule({
          accountId: replizAccountId,
          title: '',
          description: media.caption,
          type: postType,
          medias: publicUrls.map((url) => ({ url, type: mediaType })),
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
              jobId: jobId ?? null,
              status: 'scheduled',
              postType,
              mediaCount: publicUrls.length,
              caption: media.caption || null,
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

        // Baris gagal ikut dicatat supaya bisa ditinjau dan diulang belakangan.
        // Tidak menandai URL sebagai duplikat, karena status 'failed'
        // dikecualikan saat memeriksa riwayat.
        await this.historyRepo
          .save(
            this.historyRepo.create({
              url,
              replizAccountId,
              replizScheduleId: null,
              scheduledAt: null,
              jobId: jobId ?? null,
              status: 'failed',
              errorMessage: message,
            }),
          )
          .catch(() => undefined);

        results.push({ url, ok: false, error: message });
      }

      processed += 1;

      if (jobId) {
        // Kemajuan disimpan tiap batch, bukan tiap URL: menulis ribuan kali
        // membebani basis data tanpa membuat UI terasa lebih responsif.
        if (processed % BATCH_SIZE === 0 || processed === urls.length) {
          await this.jobRepo
            .update(jobId, {
              processed,
              success: results.filter((r) => r.ok).length,
              failed: results.filter((r) => !r.ok).length,
            })
            .catch(() => undefined);
        }
      }

      // Laju ditahan supaya Repliz tidak dibanjiri. Jeda dilewati pada URL
      // terakhir agar impor kecil tidak terasa lambat tanpa alasan.
      if (processed < urls.length) {
        await this.sleep(REPLIZ_CALL_DELAY_MS);
        if (processed % BATCH_SIZE === 0) await this.sleep(BATCH_PAUSE_MS);
      }
    }

    return results;
  }
}
