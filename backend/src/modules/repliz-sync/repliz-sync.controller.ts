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
import { ReplizService } from '../repliz/repliz.service';
import { In } from 'typeorm';
import { ReplizSyncRuleEntity } from './entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from './entities/repliz-synced-post.entity';
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
    private readonly replizService: ReplizService,
    @InjectRepository(ReplizSyncRuleEntity)
    private readonly ruleRepo: Repository<ReplizSyncRuleEntity>,
    @InjectRepository(ReplizSyncedPostEntity)
    private readonly syncedRepo: Repository<ReplizSyncedPostEntity>,
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

  @Post('rule/:id/run')
  @Permissions('repliz-sync:run')
  async runRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.syncService.runRule(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse(result.message, result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menjalankan rule';
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
