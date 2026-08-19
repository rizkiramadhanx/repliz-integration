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
import { ReplizSyncRuleEntity } from './entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from './entities/repliz-synced-post.entity';
import {
  CreateReplizSyncRuleDto,
  UpdateReplizSyncRuleDto,
} from './dto/repliz-sync.dto';

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, '');
}

@Controller('repliz-sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReplizSyncController {
  constructor(
    private readonly syncService: ReplizSyncService,
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
    const targetUsername = normalizeUsername(dto.targetUsername);

    const existing = await this.ruleRepo.findOne({ where: { targetUsername } });
    if (existing) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        `Target @${targetUsername} sudah terdaftar`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const rule = await this.ruleRepo.save(
      this.ruleRepo.create({ ...dto, targetUsername }),
    );
    res.status(HttpStatus.CREATED);
    return createSuccessResponse('Rule berhasil dibuat', rule);
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

    const payload = { ...dto };
    if (payload.targetUsername) {
      payload.targetUsername = normalizeUsername(payload.targetUsername);
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

    const [posts, total] = await this.syncedRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
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
}
