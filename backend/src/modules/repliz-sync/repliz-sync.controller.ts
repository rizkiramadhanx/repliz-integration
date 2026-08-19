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
import { Repository } from 'typeorm';
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
  ) {
    const posts = await this.syncedRepo.find({
      where: ruleId ? { ruleId } : {},
      order: { createdAt: 'DESC' },
      take: 200,
    });
    res.status(HttpStatus.OK);
    return createSuccessResponse('Berhasil mengambil konten tersinkron', posts);
  }
}
