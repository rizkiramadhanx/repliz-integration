import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { PostHistoryService } from './post-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import { PostHistoryStatus } from './entities/post-history.entity';
import { AutoPostTarget } from '../auto-post-rules/entities/auto-post-rule.entity';

@Controller('post-history')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostHistoryController {
  constructor(private readonly postHistoryService: PostHistoryService) {}

  @Get()
  @Permissions('post-history:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @Res({ passthrough: true }) res: Response,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: PostHistoryStatus,
    @Query('platform') platform?: AutoPostTarget,
  ) {
    try {
      const result = await this.postHistoryService.findAll(paginationDto, {
        ruleId,
        status,
        platform,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get all post history success',
        result.data,
        result.meta,
      );
    } catch (err) {
      console.error('Failed get all post history', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get post history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
