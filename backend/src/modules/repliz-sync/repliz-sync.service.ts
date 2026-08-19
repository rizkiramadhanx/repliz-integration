import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ReplizService } from '../repliz/repliz.service';
import { ReplizSyncRuleEntity } from './entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from './entities/repliz-synced-post.entity';
import { scrapeLatestInstagramPosts } from './worker/instagram-scraper.util';
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

  // Akun pemantau (x) tunggal untuk seluruh sistem. Dipilih lewat env
  // SCRAPE_BROWSING_ACCOUNT_ID; kalau tidak diisi, dipakai akun Instagram
  // pertama yang terhubung — supaya sistem tetap jalan tanpa konfigurasi
  // tambahan pada instalasi dengan satu akun IG saja.
  private async resolveBrowsingAccount(): Promise<AccountEntity> {
    const configuredId = this.configService.get<string>(
      'SCRAPE_BROWSING_ACCOUNT_ID',
    );

    if (configuredId) {
      const account = await this.accountRepo.findOne({
        where: { id: configuredId },
      });
      if (!account) {
        throw new NotFoundException(
          `Akun pemantau (SCRAPE_BROWSING_ACCOUNT_ID=${configuredId}) tidak ditemukan`,
        );
      }
      return account;
    }

    const fallback = await this.accountRepo.findOne({
      where: { type: 'instagram' },
      order: { createdAt: 'ASC' },
    });
    if (!fallback) {
      throw new NotFoundException(
        'Belum ada akun Instagram untuk dipakai sebagai akun pemantau. Tambahkan di menu Account atau set SCRAPE_BROWSING_ACCOUNT_ID.',
      );
    }
    return fallback;
  }

  // scheduleAt disusun mulai dari jam yang ditentukan rule pada hari ini.
  // Kalau jam itu sudah lewat (mis. cron telat / run manual siang hari),
  // titik mulai digeser ke sekarang + 1 interval supaya Repliz tidak
  // menerima jadwal di masa lalu yang akan langsung terbit sekaligus.
  private scheduleTimeAt(rule: ReplizSyncRuleEntity, slotIndex: number): Date {
    const [hour, minute] = rule.scheduleStartTime
      .split(':')
      .map((value) => Number(value));

    const start = new Date();
    start.setHours(hour || 0, minute || 0, 0, 0);

    const intervalMs = rule.scheduleIntervalMinutes * 60 * 1000;
    const now = Date.now();
    if (start.getTime() <= now) {
      start.setTime(now + intervalMs);
    }

    return new Date(start.getTime() + slotIndex * intervalMs);
  }

  async runRule(ruleId: string): Promise<RunRuleResult> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule tidak ditemukan');

    // Dicek sebelum scraping supaya tidak membuka browser hanya untuk
    // gagal di langkah terakhir saat URL media ternyata tidak publik.
    assertPublicBaseUrlUsable();

    const browsingAccount = await this.resolveBrowsingAccount();
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

        const posts = await scrapeLatestInstagramPosts(
          browsingAccount,
          targetUsername,
          rule.maxItems,
          excludeShortcodes,
          rule.scrapeMode,
        );

        // Scraper mengembalikan konten dari yang TERBARU lebih dulu (urutan
        // tampilan profil Instagram). Kalau dijadwalkan apa adanya, konten
        // terbaru justru terbit paling awal dan yang lama terbit belakangan —
        // urutan terbalik dari aslinya. Dibalik supaya terbit runut sesuai
        // urutan asli: yang paling lama duluan, terbaru terakhir.
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
                postUrl: `https://www.instagram.com/p/${post.shortcode}/`,
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
                postUrl: `https://www.instagram.com/p/${post.shortcode}/`,
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

  async runAllActiveRules(): Promise<RunRuleResult[]> {
    const rules = await this.ruleRepo.find({
      where: { status: 'active' },
      order: { createdAt: 'ASC' },
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
