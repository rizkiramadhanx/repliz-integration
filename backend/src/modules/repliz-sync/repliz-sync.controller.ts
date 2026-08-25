import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import { ReplizSyncService } from './repliz-sync.service';
import { UrlImportService } from './url-import.service';
import { MediaCleanupService } from './media-cleanup.service';
import { ReplizService } from '../repliz/repliz.service';
import { In } from 'typeorm';
import { ReplizSyncRuleEntity } from './entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from './entities/repliz-synced-post.entity';
import { UrlImportHistoryEntity } from './entities/url-import-history.entity';
import { UrlImportJobEntity } from './entities/url-import-job.entity';
import {
  assertPublicBaseUrlUsable,
  buildPublicUrl,
  saveBufferToPublicDir,
} from './worker/public-media.util';
import {
  CreateReplizSyncRuleDto,
  UpdateReplizSyncRuleDto,
  normalizeUsernames,
} from './dto/repliz-sync.dto';

@Controller('repliz-sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReplizSyncController {
  constructor(
    private readonly syncService: ReplizSyncService,
    private readonly urlImportService: UrlImportService,
    private readonly mediaCleanupService: MediaCleanupService,
    private readonly replizService: ReplizService,
    @InjectRepository(ReplizSyncRuleEntity)
    private readonly ruleRepo: Repository<ReplizSyncRuleEntity>,
    @InjectRepository(ReplizSyncedPostEntity)
    private readonly syncedRepo: Repository<ReplizSyncedPostEntity>,
    @InjectRepository(UrlImportJobEntity)
    private readonly importJobRepo: Repository<UrlImportJobEntity>,
    @InjectRepository(UrlImportHistoryEntity)
    private readonly importHistoryRepo: Repository<UrlImportHistoryEntity>,
  ) {}

  @Get('rule')
  @Permissions('repliz-sync:read')
  async listRules(@Res({ passthrough: true }) res: Response) {
    const rules = await this.ruleRepo.find({ order: { createdAt: 'DESC' } });
    res.status(HttpStatus.OK);
    return createSuccessResponse('Berhasil mengambil rule', rules);
  }

  @Post('rule')
  @Permissions('repliz-sync:create')
  async createRule(
    @Body() dto: CreateReplizSyncRuleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const targetUsernames = normalizeUsernames(dto.targetUsernames);
    if (targetUsernames.length === 0) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Minimal satu akun target (z) harus diisi',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Target yang sudah dipakai rule lain ditolak, karena mengkloning satu
    // akun dari dua rule berbeda akan menjadwalkan konten yang sama dua kali
    // di Repliz (anti-duplikat dipisah per rule).
    const duplicated = await this.findDuplicatedTargets(targetUsernames);
    if (duplicated.length > 0) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        `Target sudah terdaftar di rule lain: ${duplicated
          .map((t) => `@${t}`)
          .join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const rule = await this.ruleRepo.save(
      this.ruleRepo.create({ ...dto, targetUsernames }),
    );
    res.status(HttpStatus.CREATED);
    return createSuccessResponse('Rule berhasil dibuat', rule);
  }

  private async findDuplicatedTargets(
    targets: string[] = [],
    excludeRuleId?: string,
  ): Promise<string[]> {
    if (targets.length === 0) return [];
    const rules = await this.ruleRepo.find();
    const taken = new Set(
      rules
        .filter((r) => r.id !== excludeRuleId)
        .flatMap((r) => r.targetUsernames ?? []),
    );
    return targets.filter((t) => taken.has(t));
  }

  @Patch('rule/:id')
  @Permissions('repliz-sync:update')
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReplizSyncRuleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Rule tidak ditemukan', HttpStatus.NOT_FOUND);
    }

    const payload: Record<string, unknown> = { ...dto };

    if (dto.targetUsernames !== undefined) {
      const targetUsernames = normalizeUsernames(dto.targetUsernames);
      if (targetUsernames.length === 0) {
        res.status(HttpStatus.BAD_REQUEST);
        return createErrorResponse(
          'Minimal satu akun target (z) harus diisi',
          HttpStatus.BAD_REQUEST,
        );
      }

      const duplicated = await this.findDuplicatedTargets(targetUsernames, id);
      if (duplicated.length > 0) {
        res.status(HttpStatus.BAD_REQUEST);
        return createErrorResponse(
          `Target sudah terdaftar di rule lain: ${duplicated
            .map((t) => `@${t}`)
            .join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      payload.targetUsernames = targetUsernames;
    }

    await this.ruleRepo.update(id, payload);
    const updated = await this.ruleRepo.findOne({ where: { id } });
    res.status(HttpStatus.OK);
    return createSuccessResponse('Rule berhasil diperbarui', updated);
  }

  @Delete('rule/:id')
  @Permissions('repliz-sync:delete')
  async deleteRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Rule tidak ditemukan', HttpStatus.NOT_FOUND);
    }

    await this.ruleRepo.delete(id);
    res.status(HttpStatus.OK);
    return createSuccessResponse('Rule berhasil dihapus', { id });
  }

  // Fire-and-forget: scraping bisa berjalan beberapa menit, jadi request
  // tidak menunggu sampai selesai — menunggu akan membuat browser/proxy
  // timeout dan pengguna tidak tahu apakah prosesnya masih jalan. Kemajuannya
  // dipantau lewat lastRunStatus pada rule ('running' -> 'success'/'failed').
  @Post('rule/:id/run')
  @Permissions('repliz-sync:run')
  async runRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Rule tidak ditemukan', HttpStatus.NOT_FOUND);
    }

    // Mencegah rule yang sama dijalankan dua kali bersamaan: dua sesi scraping
    // paralel memakai satu akun pemantau justru memicu deteksi otomatis, dan
    // bisa menjadwalkan konten yang sama dua kali.
    if (rule.lastRunStatus === 'running') {
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse(
        'Rule ini sedang berjalan, tunggu sampai selesai',
        HttpStatus.CONFLICT,
      );
    }

    this.syncService.runRuleInBackground(id);

    res.status(HttpStatus.ACCEPTED);
    return createSuccessResponse(
      'Sinkronisasi dimulai — pantau kolom Run Terakhir',
      { ruleId: id, started: true },
    );
  }

  // Impor manual dari daftar URL yang disalin lewat extension browser.
  // Dipakai untuk platform yang listing profilnya diblokir (mis. TikTok
  // menampilkan CAPTCHA pada sesi otomatis) — URL diambil di browser
  // pengguna yang sudah login, lalu ditempel di sini.
  @Post('import-urls')
  @Permissions('repliz-sync:create')
  async importUrls(
    @Body()
    body: {
      urls?: string[] | string;
      replizAccountId?: string;
      startDate?: string;
      startTime?: string;
      intervalMinutes?: number;
      autoAddMusic?: boolean;
      postType?: 'video' | 'reels' | 'story';
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawUrls = Array.isArray(body?.urls)
      ? body.urls
      : String(body?.urls ?? '').split(/[\r\n,\s]+/);

    const urls = Array.from(
      new Set(
        rawUrls
          .map((url) => String(url).trim())
          .filter((url) => /^https?:\/\//i.test(url)),
      ),
    );

    if (urls.length === 0) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Tidak ada URL valid. Tempel URL lengkap diawali http(s)://',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!body?.replizAccountId) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Pilih akun Repliz tujuan',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Nama akun disalin ke job supaya riwayat tetap bermakna bila akunnya
      // kelak dicabut dari Repliz.
      const accounts = await this.replizService
        .listAccounts({ page: 1, limit: 100 })
        .catch(() => null);
      const account = accounts?.docs?.find(
        (item) => item.id === body.replizAccountId,
      );

      const job = await this.urlImportService.startImportJob({
        urls,
        replizAccountId: body.replizAccountId,
        replizAccountName: account?.name,
        startDate: body.startDate,
        startTime: body.startTime,
        autoAddMusic: body.autoAddMusic === true,
        intervalMinutes: body.intervalMinutes,
        postType: body.postType,
      });

      // 202: pekerjaan diterima tapi belum selesai. Impor ribuan URL bisa
      // memakan puluhan menit, jauh melewati batas 100 detik Cloudflare.
      res.status(HttpStatus.ACCEPTED);
      return createSuccessResponse(
        `${urls.length} URL sedang diproses di latar belakang`,
        { jobId: job.id, total: job.total },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal mengimpor URL';
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(message, HttpStatus.BAD_REQUEST);
    }
  }

  // Daftar batch impor. Dipisah dari riwayat per-URL supaya UI bisa
  // menampilkan kemajuan job yang sedang berjalan tanpa memuat ribuan baris.
  // Menerima media mentah dari extension lalu mengembalikan URL publiknya.
  // Dibutuhkan karena CDN Threads/Instagram menolak permintaan dari server
  // luar (HTTP 403), sehingga Repliz tidak bisa mengunduh langsung dari URL
  // aslinya — browser pengguna yang sudah punya sesi login mengambil bytenya,
  // lalu menitipkannya ke sini.
  @Post('media-upload')
  @Permissions('repliz-sync:create')
  async uploadMedia(
    @Body() body: { contentType?: string; dataBase64?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const contentType = (body?.contentType ?? '').trim();
    const dataBase64 = body?.dataBase64 ?? '';

    if (!contentType || !dataBase64) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'contentType dan dataBase64 wajib diisi',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Divalidasi lebih dulu: menyimpan berkas yang URL-nya nanti tidak bisa
      // dijangkau Repliz hanya menyisakan sampah di disk.
      assertPublicBaseUrlUsable();

      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length === 0) {
        throw new Error('Data media kosong atau bukan base64 yang sah');
      }
      // Batas selaras dengan ukuran video pendek; tanpa ini satu unggahan
      // keliru bisa memenuhi disk VPS.
      if (buffer.length > 100 * 1024 * 1024) {
        throw new Error('Media melebihi 100 MB');
      }

      const saved = saveBufferToPublicDir(buffer, contentType);
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Media tersimpan', {
        url: buildPublicUrl(saved.publicPath),
        bytes: buffer.length,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menyimpan media';
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(message, HttpStatus.BAD_REQUEST);
    }
  }

  // Ringkasan berkas media di disk server: berapa yang bisa dibersihkan dan
  // berapa yang masih dipakai jadwal mendatang. Dipisah dari aksi hapusnya
  // supaya UI bisa menampilkan angkanya sebelum pengguna memutuskan.
  @Get('media-cleanup')
  @Permissions('repliz-sync:read')
  async previewMediaCleanup(@Res({ passthrough: true }) res: Response) {
    const preview = await this.mediaCleanupService.preview();
    res.status(HttpStatus.OK);
    return createSuccessResponse('Ringkasan media di server', preview);
  }

  // Menghapus berkas media yang sudah lewat masa pakainya dari disk server.
  // Jadwal di Repliz TIDAK disentuh — hanya berkas di disk yang dibuang.
  @Delete('media-cleanup')
  @Permissions('repliz-sync:delete')
  async runMediaCleanup(@Res({ passthrough: true }) res: Response) {
    try {
      const result = await this.mediaCleanupService.cleanup();
      const megabytes = (result.bytesFreed / 1024 / 1024).toFixed(1);
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        `${result.deleted} berkas dihapus, ${megabytes} MB dibebaskan`,
        result,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal membersihkan media';
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('import-job')
  @Permissions('repliz-sync:read')
  async listImportJobs(
    @Res({ passthrough: true }) res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 10));

    const [jobs, total] = await this.importJobRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    });

    res.status(HttpStatus.OK);
    return createSuccessResponse('Berhasil mengambil job impor', {
      data: jobs,
      meta: {
        page: currentPage,
        limit: perPage,
        total,
        total_page: Math.ceil(total / perPage),
      },
    });
  }

  // Riwayat impor per URL, dengan penyaring yang sama seperti Konten
  // Tersinkron: rentang tanggal dan status.
  @Get('import-history')
  @Permissions('repliz-sync:read')
  async listImportHistory(
    @Res({ passthrough: true }) res: Response,
    @Query('jobId') jobId?: string,
    @Query('replizAccountId') replizAccountId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Difilter pada created_at (kapan URL diproses), bukan scheduled_at:
    // scheduled_at kosong untuk baris gagal, sehingga menyaring dengannya
    // justru menyembunyikan baris yang paling perlu ditinjau.
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Format tanggal tidak valid, gunakan YYYY-MM-DD',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (from && to && from > to) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'dateFrom tidak boleh melewati dateTo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const where: Record<string, unknown> = {};
    if (jobId) where.jobId = jobId;
    if (replizAccountId) where.replizAccountId = replizAccountId;
    if (status) where.status = status;
    if (from && to) where.createdAt = Between(from, to);
    else if (from) where.createdAt = MoreThanOrEqual(from);
    else if (to) where.createdAt = LessThanOrEqual(to);

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(limit) || 25));

    const [rows, total] = await this.importHistoryRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    });

    res.status(HttpStatus.OK);
    return createSuccessResponse('Berhasil mengambil riwayat impor', {
      data: rows,
      meta: {
        page: currentPage,
        limit: perPage,
        total,
        total_page: Math.ceil(total / perPage),
      },
    });
  }

  // Mengulang URL yang gagal pada satu job, tanpa menyentuh yang sudah
  // berhasil — supaya tidak ada jadwal ganda.
  @Post('import-job/:id/retry')
  @Permissions('repliz-sync:create')
  async retryFailedImports(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const job = await this.importJobRepo.findOne({ where: { id } });
    if (!job) {
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Job tidak ditemukan', HttpStatus.NOT_FOUND);
    }
    if (job.status === 'running') {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Job masih berjalan, tunggu sampai selesai',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Yang diulang bukan hanya baris berstatus 'failed', tapi juga URL yang
    // BELUM punya baris sama sekali — kasus server dimulai ulang di tengah
    // impor, di mana sisa URL tidak pernah sempat dicoba dan karenanya tidak
    // meninggalkan jejak apa pun.
    const rows = await this.importHistoryRepo.find({ where: { jobId: id } });
    const scheduled = new Set(
      rows.filter((row) => row.status === 'scheduled').map((row) => row.url),
    );
    const candidates = job.urls?.length
      ? job.urls
      : rows.filter((row) => row.status === 'failed').map((row) => row.url);
    const urls = Array.from(
      new Set(candidates.filter((url) => !scheduled.has(url))),
    );

    if (urls.length === 0) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Tidak ada URL yang perlu diulang pada job ini',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Memakai pengaturan penjadwalan job asal supaya pengguna tidak perlu
      // mengisinya lagi. Tanggal mulai dikosongkan agar slotnya dihitung
      // ulang dari sekarang, bukan menumpuk di tanggal yang sudah lewat.
      const retryJob = await this.urlImportService.startImportJob({
        urls,
        replizAccountId: job.replizAccountId,
        replizAccountName: job.replizAccountName ?? undefined,
        startTime: job.startTime ?? '06:00',
        intervalMinutes: job.intervalMinutes,
        autoAddMusic: job.autoAddMusic,
      });

      res.status(HttpStatus.ACCEPTED);
      return createSuccessResponse(
        `${urls.length} URL gagal sedang diulang`,
        { jobId: retryJob.id, total: retryJob.total },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengulang';
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('synced-post')
  @Permissions('repliz-sync:read')
  async listSyncedPosts(
    @Res({ passthrough: true }) res: Response,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Rentang tanggal difilter pada created_at (kapan konten diproses),
    // bukan scheduled_at — scheduled_at bisa null untuk konten yang gagal,
    // sehingga memfilter dengannya akan menyembunyikan justru baris yang
    // paling perlu ditinjau.
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Format tanggal tidak valid, gunakan YYYY-MM-DD',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (from && to && from > to) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'dateFrom tidak boleh melewati dateTo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const where: Record<string, unknown> = {};
    if (ruleId) where.ruleId = ruleId;
    if (status) where.status = status;
    if (from && to) where.createdAt = Between(from, to);
    else if (from) where.createdAt = MoreThanOrEqual(from);
    else if (to) where.createdAt = LessThanOrEqual(to);

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(limit) || 25));

    // Diurutkan berdasarkan scheduledAt, bukan createdAt: seluruh konten satu
    // run tersimpan dalam hitungan detik sehingga createdAt tidak membedakan
    // urutan tayang. scheduledAt menaik menampilkan konten sesuai urutan
    // terbitnya — sama dengan urutan asli di profil sumber. createdAt dipakai
    // sebagai penentu kedua untuk baris gagal yang scheduledAt-nya null.
    const [posts, total] = await this.syncedRepo.findAndCount({
      where,
      order: { scheduledAt: 'ASC', createdAt: 'ASC' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    });

    res.status(HttpStatus.OK);
    return createSuccessResponse('Berhasil mengambil konten tersinkron', {
      data: posts,
      meta: {
        page: currentPage,
        limit: perPage,
        total,
        total_page: Math.ceil(total / perPage),
      },
    });
  }

  // Menghapus catatan sinkronisasi. `alsoDeleteOnRepliz` menghapus pula
  // jadwalnya di Repliz — dipisah sebagai opsi karena tidak selalu
  // diinginkan: menghapus catatan lokal saja membuat konten itu dianggap
  // baru lagi pada run berikutnya (anti-duplikat memakai tabel ini),
  // sementara jadwal di Repliz tetap terbit.
  @Delete('synced-post')
  @Permissions('repliz-sync:delete')
  async deleteSyncedPosts(
    @Body()
    body: {
      ids?: string[];
      ruleId?: string;
      all?: boolean;
      alsoDeleteOnRepliz?: boolean;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const ids = (body?.ids ?? []).filter(Boolean);
    const { ruleId, all, alsoDeleteOnRepliz } = body ?? {};

    if (ids.length === 0 && !ruleId && !all) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'Tentukan ids, ruleId, atau all:true',
        HttpStatus.BAD_REQUEST,
      );
    }

    let where: Record<string, unknown>;
    if (ids.length > 0) where = { id: In(ids) };
    else if (ruleId) where = { ruleId };
    else where = {};

    const targets = await this.syncedRepo.find({ where });
    if (targets.length === 0) {
      res.status(HttpStatus.OK);
      return createSuccessResponse('Tidak ada konten yang dihapus', {
        deleted: 0,
        deletedOnRepliz: 0,
      });
    }

    let deletedOnRepliz = 0;
    let replizError: string | null = null;

    if (alsoDeleteOnRepliz) {
      const scheduleIds = targets
        .map((row) => row.replizScheduleId)
        .filter((id): id is string => Boolean(id));

      if (scheduleIds.length > 0) {
        try {
          deletedOnRepliz =
            await this.replizService.deleteSchedules(scheduleIds);
        } catch (err) {
          // Kegagalan di Repliz tidak membatalkan penghapusan lokal, tapi
          // dilaporkan supaya tidak terlihat sukses sepenuhnya.
          replizError =
            err instanceof Error ? err.message : 'Gagal menghapus di Repliz';
        }
      }
    }

    await this.syncedRepo.delete(targets.map((row) => row.id));

    res.status(HttpStatus.OK);
    return createSuccessResponse(
      replizError
        ? `${targets.length} catatan dihapus, tapi gagal menghapus di Repliz: ${replizError}`
        : alsoDeleteOnRepliz
          ? `${targets.length} catatan dihapus, ${deletedOnRepliz} jadwal dihapus di Repliz`
          : `${targets.length} catatan dihapus`,
      {
        deleted: targets.length,
        deletedOnRepliz,
        replizError,
      },
    );
  }
}
