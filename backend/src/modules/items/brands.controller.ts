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
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createErrorResponse, createSuccessResponse } from '../../common/type/response';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';
import { LogsService } from '../logs/logs.service';

@Controller('brand')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Permissions('brand:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.brandsService.list(paginationDto);
      await this.logsService.createLog({ action: 'brand:read', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Get all brands success', result.data, result.meta);
    } catch (err) {
      console.error('Failed get all brands', err);
      await this.logsService.createLog({ action: 'brand:read', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.INTERNAL_SERVER_ERROR });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse('Failed to get brands', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @Permissions('brand:create')
  async create(
    @Body() dto: CreateBrandDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.brandsService.create(dto);
      await this.logsService.createLog({ action: 'brand:create', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.CREATED });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Brand created', created);
    } catch (err) {
      console.error('Failed create brand', err);
      await this.logsService.createLog({ action: 'brand:create', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.CONFLICT });
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse('Failed to create brand', HttpStatus.CONFLICT);
    }
  }

  @Get(':id')
  @Permissions('brand:read')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.brandsService.detail(id);
      await this.logsService.createLog({ action: 'brand:read', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Brand detail', item);
    } catch (err) {
      console.error('Failed get brand detail', err);
      await this.logsService.createLog({ action: 'brand:read', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Brand not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @Permissions('brand:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.brandsService.update(id, dto);
      await this.logsService.createLog({ action: 'brand:update', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Brand updated', updated);
    } catch (err) {
      console.error('Failed update brand', err);
      await this.logsService.createLog({ action: 'brand:update', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to update brand', HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':id')
  @Permissions('brand:delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.brandsService.delete(id);
      await this.logsService.createLog({ action: 'brand:delete', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Brand deleted', true);
    } catch (err) {
      console.error('Failed delete brand', err);
      await this.logsService.createLog({ action: 'brand:delete', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to delete brand', HttpStatus.NOT_FOUND);
    }
  }
}
