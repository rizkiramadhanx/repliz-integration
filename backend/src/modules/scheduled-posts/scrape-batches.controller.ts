import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ScrapeBatchesService } from './scrape-batches.service';
import {
  GenerateDraftsFromScrapeDto,
  StartScrapeBatchDto,
} from './dto/scrape-batch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../common/type/response';

@Controller('scrape-batches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScrapeBatchesController {
  constructor(private readonly service: ScrapeBatchesService) {}

  @Get()
  @Permissions('scheduled-post:read')
  async all(
    @Query() pagination: PaginationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.findAll(pagination);
    res.status(HttpStatus.OK);
    return createSuccessResponse(
      'Get all scrape batches success',
      result.data,
      result.meta,
    );
  }

  @Post()
  @Permissions('scheduled-post:create')
  async start(
    @Body() dto: StartScrapeBatchDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.service.startBatch(dto);
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Scrape batch dimulai', created);
    } catch (err) {
      console.error('Failed start scrape batch', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to start scrape batch',
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
      const item = await this.service.findOne(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Scrape batch detail', item);
    } catch (err) {
      console.error('Failed get scrape batch detail', err);
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse(
        'Scrape batch not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':id/posts')
  @Permissions('scheduled-post:read')
  async posts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.findScrapedPosts(id, pagination);
    res.status(HttpStatus.OK);
    return createSuccessResponse(
      'Get scraped posts success',
      result.data,
      result.meta,
    );
  }

  @Post(':id/stop')
  @Permissions('scheduled-post:run')
  async stop(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.service.stop(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Scrape batch dihentikan', updated);
    } catch (err) {
      console.error('Failed stop scrape batch', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to stop scrape batch',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/generate-drafts')
  @Permissions('scheduled-post:create')
  async generateDrafts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateDraftsFromScrapeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.service.generateDrafts(id, dto);
      res.status(HttpStatus.CREATED);
      return createSuccessResponse(
        'Draft berhasil dibuat dari scrape',
        created,
      );
    } catch (err) {
      console.error('Failed generate drafts from scrape', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to generate drafts',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
