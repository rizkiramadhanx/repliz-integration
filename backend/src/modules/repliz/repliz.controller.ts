import {
  Controller,
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
}
