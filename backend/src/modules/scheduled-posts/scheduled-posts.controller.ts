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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ScheduledPostsService } from './scheduled-posts.service';
import {
  BulkIdsDto,
  CreateScheduledPostDraftDto,
  FindAllScheduledPostsQueryDto,
  ScheduleDto,
  UpdateScheduledPostDraftDto,
} from './dto/scheduled-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../common/type/response';
import {
  scheduledPostMediaFileFilter,
  scheduledPostMediaStorage,
  SCHEDULED_POST_MEDIA_MAX_SIZE_BYTES,
} from './worker/scheduled-post-upload.util';

@Controller('scheduled-posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScheduledPostsController {
  constructor(private readonly service: ScheduledPostsService) {}

  @Post('upload-media')
  @Permissions('scheduled-post:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: scheduledPostMediaStorage,
      limits: { fileSize: SCHEDULED_POST_MEDIA_MAX_SIZE_BYTES },
      fileFilter: scheduledPostMediaFileFilter,
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!file) {
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        'File tidak valid. Hanya menerima gambar (jpg/png/webp) atau video (mp4/mov) maksimal 50MB',
        HttpStatus.BAD_REQUEST,
      );
    }
    res.status(HttpStatus.CREATED);
    return createSuccessResponse('Media berhasil diupload', {
      path: `scheduled-post-media/${file.filename}`,
      mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
    });
  }

  @Get()
  @Permissions('scheduled-post:read')
  async all(
    @Query() query: FindAllScheduledPostsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.service.findAll(query, {
        startDate: query.startDate,
        endDate: query.endDate,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get all scheduled posts success',
        result.data,
        result.meta,
      );
    } catch (err) {
      console.error('Failed get all scheduled posts', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get scheduled posts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Permissions('scheduled-post:create')
  async create(
    @Body() dto: CreateScheduledPostDraftDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.service.createDraft(dto.caption);
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Draft berhasil dibuat', created);
    } catch (err) {
      console.error('Failed create draft', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to create draft',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @Permissions('scheduled-post:read')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.service.getOneForResponse(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Scheduled post detail', item);
    } catch (err) {
      console.error('Failed get scheduled post detail', err);
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse(
        'Scheduled post not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  @Permissions('scheduled-post:update')
  @UseInterceptors(
    FileInterceptor('media', {
      storage: scheduledPostMediaStorage,
      limits: { fileSize: SCHEDULED_POST_MEDIA_MAX_SIZE_BYTES },
      fileFilter: scheduledPostMediaFileFilter,
    }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduledPostDraftDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.service.updateDraft(id, dto, file);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Draft berhasil diupdate', updated);
    } catch (err) {
      console.error('Failed update draft', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to update draft',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/schedule')
  @Permissions('scheduled-post:update')
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.service.schedule(id, dto.scheduledAt);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Post berhasil dijadwalkan', updated);
    } catch (err) {
      console.error('Failed schedule post', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to schedule post',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/publish-now')
  @Permissions('scheduled-post:run')
  async publishNow(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.service.publishNowById(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Post sedang diproses untuk publish', true);
    } catch (err) {
      console.error('Failed publish now', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to publish now',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('bulk-publish-now')
  @Permissions('scheduled-post:run')
  async bulkPublishNow(
    @Body() dto: BulkIdsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.bulkPublishNow(dto.ids);
    res.status(HttpStatus.OK);
    return createSuccessResponse('Bulk publish now diproses', result);
  }

  @Post(':id/cancel')
  @Permissions('scheduled-post:update')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.service.cancelById(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Jadwal berhasil dibatalkan', updated);
    } catch (err) {
      console.error('Failed cancel scheduled post', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to cancel scheduled post',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Permissions('scheduled-post:delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.service.deleteById(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Scheduled post berhasil dihapus', true);
    } catch (err) {
      console.error('Failed delete scheduled post', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to delete scheduled post',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('bulk-delete')
  @Permissions('scheduled-post:delete')
  async bulkDelete(
    @Body() dto: BulkIdsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.bulkDelete(dto.ids);
    res.status(HttpStatus.OK);
    return createSuccessResponse('Bulk delete diproses', result);
  }
}
