import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReplizService } from './repliz.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';

@Controller('repliz')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReplizController {
  constructor(private readonly replizService: ReplizService) {}

  @Get('account')
  @Permissions('repliz:read')
  async listAccounts(
    @Res({ passthrough: true }) res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('types') types?: string | string[],
  ) {
    try {
      const normalizedTypes = types
        ? Array.isArray(types)
          ? types
          : [types]
        : undefined;

      const data = await this.replizService.listAccounts({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search,
        types: normalizedTypes,
      });

      res.status(HttpStatus.OK);
      return createSuccessResponse('Berhasil mengambil akun Repliz', data);
    } catch (err) {
      const status =
        err instanceof HttpException
          ? err.getStatus()
          : HttpStatus.BAD_REQUEST;
      const message =
        err instanceof Error ? err.message : 'Gagal mengambil akun Repliz';

      console.error('Failed to list Repliz accounts', err);
      res.status(status);
      return createErrorResponse(message, status);
    }
  }

  @Get('schedule')
  @Permissions('repliz:read')
  async listSchedules(
    @Res({ passthrough: true }) res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    try {
      const data = await this.replizService.listSchedules({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        status,
        fromDate,
        toDate,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Berhasil mengambil jadwal Repliz', data);
    } catch (err) {
      const status =
        err instanceof HttpException ? err.getStatus() : HttpStatus.BAD_REQUEST;
      const message =
        err instanceof Error ? err.message : 'Gagal mengambil jadwal Repliz';
      console.error('Failed to list Repliz schedules', err);
      res.status(status);
      return createErrorResponse(message, status);
    }
  }

  // Menghapus jadwal di Repliz bersifat permanen, jadi endpoint ini hanya
  // menerima daftar id eksplisit — tidak ada mode "hapus semua" tanpa
  // penyebutan id, supaya tidak ada jalur yang bisa menghapus seluruh
  // jadwal hanya karena salah kirim request kosong.
  @Delete('schedule')
  @Permissions('repliz:delete')
  async deleteSchedules(
    @Body() body: { scheduleIds?: string[] },
    @Res({ passthrough: true }) res: Response,
  ) {
    const scheduleIds = (body?.scheduleIds ?? []).filter(Boolean);

    if (scheduleIds.length === 0) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'scheduleIds wajib diisi minimal 1 id',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const deleted = await this.replizService.deleteSchedules(scheduleIds);
      res.status(HttpStatus.OK);
      return createSuccessResponse(`${deleted} jadwal dihapus dari Repliz`, {
        deleted,
      });
    } catch (err) {
      const status =
        err instanceof HttpException ? err.getStatus() : HttpStatus.BAD_REQUEST;
      const message =
        err instanceof Error ? err.message : 'Gagal menghapus jadwal Repliz';
      console.error('Failed to delete Repliz schedules', err);
      res.status(status);
      return createErrorResponse(message, status);
    }
  }
}
