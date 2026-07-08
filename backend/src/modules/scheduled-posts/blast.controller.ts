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
import { BlastService } from './blast.service';
import { StartBlastDto } from './dto/blast.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../common/type/response';

@Controller('blast-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BlastController {
  constructor(private readonly service: BlastService) {}

  @Get()
  @Permissions('scheduled-post:read')
  async all(
    @Query() pagination: PaginationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.findAll(pagination);
    res.status(HttpStatus.OK);
    return createSuccessResponse(
      'Get all blast jobs success',
      result.data,
      result.meta,
    );
  }

  @Post()
  @Permissions('scheduled-post:create')
  async start(
    @Body() dto: StartBlastDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.service.startBlast(dto);
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Blast job dimulai', created);
    } catch (err) {
      console.error('Failed start blast job', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to start blast job',
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
      return createSuccessResponse('Blast job detail', item);
    } catch (err) {
      console.error('Failed get blast job detail', err);
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Blast job not found', HttpStatus.NOT_FOUND);
    }
  }

  @Get(':id/results')
  @Permissions('scheduled-post:read')
  async results(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.findResults(id);
    res.status(HttpStatus.OK);
    return createSuccessResponse('Get blast group results success', result);
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
      return createSuccessResponse('Blast job dihentikan', updated);
    } catch (err) {
      console.error('Failed stop blast job', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to stop blast job',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
