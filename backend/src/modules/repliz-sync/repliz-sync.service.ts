import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ReplizService } from '../repliz/repliz.service';
import {
  ReplizSyncRuleEntity,
  ReplizSyncSourcePlatform,
} from './entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from './entities/repliz-synced-post.entity';
import { scrapeLatestInstagramPosts } from './worker/instagram-scraper.util';
import { scrapeLatestFacebookPosts } from './worker/facebook-scraper.util';
import {
  assertPublicBaseUrlUsable,
  buildPublicUrl,
  downloadToPublicDir,
} from './worker/public-media.util';

export type RunTargetResult = {
  targetUsername: string;
  scraped: number;
  fresh: number;
  scheduled: number;
  failed: number;
  error?: string;
};

export type RunRuleResult = {
  ruleId: string;
  targets: RunTargetResult[];
  scraped: number;
  fresh: number;
  scheduled: number;
  failed: number;
  message: string;
};

@Injectable()
export class ReplizSyncService {
  private readonly logger = new Logger(ReplizSyncService.name);

  constructor(
    @InjectRepository(ReplizSyncRuleEntity)
    private readonly ruleRepo: Repository<ReplizSyncRuleEntity>,
    @InjectRepository(ReplizSyncedPostEntity)
    private readonly syncedRepo: Repository<ReplizSyncedPostEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    private readonly replizService: ReplizService,
    private readonly configService: ConfigService,
  ) {}

  // Akun pemantau (x) untuk platform tertentu. Scraping Facebook butuh
  // cookies akun Facebook dan Instagram butuh cookies Instagram, jadi akun
  // dipilih per platform — bukan satu akun untuk semua.
  //
  // Env yang dipakai: SCRAPE_BROWSING_ACCOUNT_ID untuk Instagram (nama lama,
  // dipertahankan supaya konfigurasi yang sudah ada tidak rusak) dan
  // SCRAPE_BROWSING_ACCOUNT_ID_FACEBOOK untuk Facebook. Bila tidak diisi,
  // dipakai akun pertama dengan tipe yang cocok.
  private async resolveBrowsingAccount(
    platform: ReplizSyncSourcePlatform,
  ): Promise<AccountEntity> {
    const envKey =
      platform === 'facebook'
        ? 'SCRAPE_BROWSING_ACCOUNT_ID_FACEBOOK'
        : 'SCRAPE_BROWSING_ACCOUNT_ID';
    const configuredId = this.configService.get<string>(envKey);

    if (configuredId) {
      const account = await this.accountRepo.findOne({
        where: { id: configuredId },
      });
      if (!account) {
        throw new NotFoundException(
          `Akun pemantau (${envKey}=${configuredId}) tidak ditemukan`,
        );
      }
      // Akun dengan tipe salah akan gagal dengan pesan membingungkan saat
      // cookies-nya dipakai, jadi ditolak lebih awal dengan sebab yang jelas.
      if (account.type !== platform) {
        throw new NotFoundException(
          `Akun pemantau (${envKey}) bertipe ${account.type}, sedangkan rule ini butuh akun ${platform}`,
        );
      }
      return account;
    }

    const fallback = await this.accountRepo.findOne({
      where: { type: platform },
      order: { createdAt: 'ASC' },
    });
    if (!fallback) {
      throw new NotFoundException(
        `Belum ada akun ${platform} untuk dipakai sebagai akun pemantau. Tambahkan di menu Account atau set ${envKey}.`,
      );
    }
    return fallback;
  }

  // scheduleAt disusun mulai dari jam yang ditentukan rule pada hari ini.
  // Kalau jam itu sudah lewat (mis. cron telat / run manual siang hari),
  // titik mulai digeser ke sekarang + 1 interval supaya Repliz tidak
  // menerima jadwal di masa lalu yang akan langsung terbit sekaligus.
  // Jumlah konten maksimum yang boleh dijadwalkan dalam satu hari. Tanpa
  // batas ini, 25 konten dengan interval 60 menit akan melewati tengah malam
  // dan tumpah ke tanggal berikutnya di tengah rangkaian — jadwalnya jadi
  // sulit ditinjau dan tidak sesuai harapan "sehari sekian konten".
  private static readonly MAX_SLOTS_PER_DAY = 24;

  // Membagi slot ke dalam hari: MAX_SLOTS_PER_DAY konten pertama masuk hari
  // pertama, sisanya pindah ke hari berikutnya dan mulai lagi dari jam yang
  // sama. Slot dalam satu hari juga dipotong agar tidak melewati tengah
  // malam, sehingga isi satu hari tidak pernah bocor ke tanggal lain.
  private scheduleTimeAt(rule: ReplizSyncRuleEntity, slotIndex: number): Date {
    const [hour, minute] = rule.scheduleStartTime
      .split(':')
      .map((value) => Number(value));

    const intervalMs = rule.scheduleIntervalMinutes * 60 * 1000;

    // Berapa slot yang muat sebelum tengah malam, dihitung dari jam mulai.
    // Slot ke-n jatuh pada start + n*interval; yang muat adalah n dengan
    // n*interval < sisa menit hari itu, sehingga jumlahnya ceil(sisa/interval).
    const startMinuteOfDay = (hour || 0) * 60 + (minute || 0);
    const minutesLeftInDay = 24 * 60 - startMinuteOfDay;
    const slotsBeforeMidnight = Math.max(
      1,
      Math.ceil(minutesLeftInDay / rule.scheduleIntervalMinutes),
    );

    const slotsPerDay = Math.min(
      ReplizSyncService.MAX_SLOTS_PER_DAY,
      slotsBeforeMidnight,
    );

    const dayOffset = Math.floor(slotIndex / slotsPerDay);
    const slotInDay = slotIndex % slotsPerDay;

    const start = new Date();
    start.setHours(hour || 0, minute || 0, 0, 0);

    // Kalau jam mulai hari ini sudah lewat (cron telat / run manual siang
    // hari), seluruh rangkaian digeser ke hari berikutnya pada jam yang sama
    // — bukan ke "sekarang + interval", supaya jam terbit tetap konsisten
    // dengan yang dikonfigurasi.
    const baseDayOffset = start.getTime() <= Date.now() ? 1 : 0;

    // setDate() dipakai (bukan penjumlahan milidetik) supaya pergeseran hari
    // tetap benar saat melewati batas DST.
    start.setDate(start.getDate() + baseDayOffset + dayOffset);
    return new Date(start.getTime() + slotInDay * intervalMs);
  }

  async runRule(ruleId: string): Promise<RunRuleResult> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule tidak ditemukan');

    // Dicek sebelum scraping supaya tidak membuka browser hanya untuk
    // gagal di langkah terakhir saat URL media ternyata tidak publik.
    assertPublicBaseUrlUsable();

    const platform: ReplizSyncSourcePlatform =
      rule.sourcePlatform ?? 'instagram';
    const browsingAccount = await this.resolveBrowsingAccount(platform);
    const targets = rule.targetUsernames ?? [];

    // Jadwal disusun lintas-target dalam satu rule, bukan diulang dari jam
    // mulai untuk tiap target — kalau tiap target mulai dari 06:00 lagi,
    // konten dari beberapa target akan bertumpuk pada jam yang sama.
    let slotIndex = 0;
    const results: RunTargetResult[] = [];

    for (const targetUsername of targets) {
      try {
        const alreadySynced = await this.syncedRepo.find({
          where: { ruleId: rule.id, targetUsername },
          select: { shortcode: true },
        });
        const excludeShortcodes = new Set(
          alreadySynced.map((row) => row.shortcode),
        );

        // Hasil kedua scraper dinormalkan ke bentuk yang sama supaya sisa
        // alur (jadwal, unduh media, catat) tidak perlu tahu platformnya.
        // `shortcode` menampung id postingan Facebook agar kunci anti-duplikat
        // yang sudah ada tetap dipakai tanpa kolom tambahan.
        const posts =
          platform === 'facebook'
            ? (
                await scrapeLatestFacebookPosts(
                  browsingAccount,
                  targetUsername,
                  rule.maxItems,
                  excludeShortcodes,
                )
              ).map((post) => ({
                shortcode: post.postId,
                caption: post.caption,
                mediaUrl: post.mediaUrl,
                isVideo: post.isVideo,
                postUrl: post.postUrl,
              }))
            : (
                await scrapeLatestInstagramPosts(
                  browsingAccount,
                  targetUsername,
                  rule.maxItems,
                  excludeShortcodes,
                  rule.scrapeMode,
                )
              ).map((post) => ({
                shortcode: post.shortcode,
                caption: post.caption,
                mediaUrl: post.mediaUrl,
                isVideo: post.isVideo,
                postUrl: `https://www.instagram.com/p/${post.shortcode}/`,
              }));

        // Scraper mengembalikan konten dari yang TERBARU lebih dulu (urutan
        // tampilan profil). Kalau dijadwalkan apa adanya, konten terbaru
        // justru terbit paling awal dan yang lama terbit belakangan — urutan
        // terbalik dari aslinya. Dibalik supaya terbit runut sesuai urutan
        // asli: yang paling lama duluan, terbaru terakhir.
        const fresh = posts
          .filter((post) => !excludeShortcodes.has(post.shortcode))
          .reverse();

        let scheduled = 0;
        let failed = 0;

        for (const post of fresh) {
          const scheduledAt = this.scheduleTimeAt(rule, slotIndex);
          slotIndex += 1;

          try {
            const media = await downloadToPublicDir(post.mediaUrl);
            const publicUrl = buildPublicUrl(media.publicPath);

            const result = await this.replizService.createSchedule({
              accountId: rule.replizAccountId,
              title: '',
              description: post.caption ?? '',
              type: post.isVideo ? 'video' : 'image',
              medias: [
                {
                  url: publicUrl,
                  type: post.isVideo ? 'video' : 'image',
                },
              ],
              scheduleAt: scheduledAt.toISOString(),
            });

            await this.syncedRepo.save(
              this.syncedRepo.create({
                ruleId: rule.id,
                targetUsername,
                shortcode: post.shortcode,
                postUrl: post.postUrl,
                caption: post.caption ?? null,
                mediaUrl: publicUrl,
                isVideo: post.isVideo,
                replizScheduleId: result.scheduleId,
                scheduledAt,
                status: 'scheduled',
              }),
            );
            scheduled += 1;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Gagal memproses konten';
            this.logger.error(
              `Rule ${rule.id} (@${targetUsername}) gagal memproses ${post.shortcode}: ${message}`,
            );

            // Kegagalan tetap dicatat supaya konten yang sama tidak dicoba
            // berulang tiap hari; status 'failed' membedakannya dari yang
            // benar-benar terjadwal saat ditinjau di UI.
            await this.syncedRepo.save(
              this.syncedRepo.create({
                ruleId: rule.id,
                targetUsername,
                shortcode: post.shortcode,
                postUrl: post.postUrl,
                caption: post.caption ?? null,
                isVideo: post.isVideo,
                status: 'failed',
                errorMessage: message,
              }),
            );
            failed += 1;
          }
        }

        results.push({
          targetUsername,
          scraped: posts.length,
          fresh: fresh.length,
          scheduled,
          failed,
        });
      } catch (error) {
        // Satu target gagal (mis. akun private / tidak ada) tidak boleh
        // menggagalkan target lain dalam rule yang sama.
        const message =
          error instanceof Error ? error.message : 'Gagal memproses target';
        this.logger.error(`Rule ${rule.id} (@${targetUsername}): ${message}`);
        results.push({
          targetUsername,
          scraped: 0,
          fresh: 0,
          scheduled: 0,
          failed: 0,
          error: message,
        });
      }
    }

    const total = results.reduce(
      (acc, r) => ({
        scraped: acc.scraped + r.scraped,
        fresh: acc.fresh + r.fresh,
        scheduled: acc.scheduled + r.scheduled,
        failed: acc.failed + r.failed,
      }),
      { scraped: 0, fresh: 0, scheduled: 0, failed: 0 },
    );

    const errored = results.filter((r) => r.error);
    const message =
      `${targets.length} target: scrape ${total.scraped}, baru ${total.fresh}, ` +
      `terjadwal ${total.scheduled}, gagal ${total.failed}` +
      (errored.length
        ? ` — ${errored.length} target error (${errored
            .map((r) => `@${r.targetUsername}`)
            .join(', ')})`
        : '');

    await this.ruleRepo.update(rule.id, {
      lastRunAt: new Date(),
      lastRunStatus:
        total.scheduled === 0 && (total.failed > 0 || errored.length > 0)
          ? 'failed'
          : 'success',
      lastRunMessage: message,
    });

    return {
      ruleId: rule.id,
      targets: results,
      ...total,
      message,
    };
  }

  // `onlyHour` diisi cron (0-23, WIB) supaya hanya rule yang jam scrape-nya
  // cocok yang dijalankan — inilah yang menyebarkan beban. Dipanggil tanpa
  // argumen (mis. dari tombol jalankan manual) berarti semua rule aktif.
  async runAllActiveRules(onlyHour?: number): Promise<RunRuleResult[]> {
    const allRules = await this.ruleRepo.find({
      where: { status: 'active' },
      order: { createdAt: 'ASC' },
    });

    const rules =
      onlyHour === undefined
        ? allRules
        : allRules.filter((rule) => {
            // Rule lama tanpa scrapeTime diperlakukan 05:00 supaya
            // perilakunya tidak berubah setelah pembaruan ini.
            const [hour] = (rule.scrapeTime ?? '05:00').split(':');
            return Number(hour) === onlyHour;
          });

    const results: RunRuleResult[] = [];
    // Sengaja berurutan, bukan paralel: semua rule memakai satu akun
    // pemantau yang sama, dan membuka banyak sesi Instagram bersamaan dari
    // satu akun justru memicu deteksi otomatis.
    for (const rule of rules) {
      try {
        results.push(await this.runRule(rule.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gagal menjalankan rule';
        this.logger.error(`Rule ${rule.id} gagal: ${message}`);
        await this.ruleRepo.update(rule.id, {
          lastRunAt: new Date(),
          lastRunStatus: 'failed',
          lastRunMessage: message,
        });
      }
    }
    return results;
  }
}
