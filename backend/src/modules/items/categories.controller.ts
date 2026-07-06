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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createErrorResponse, createSuccessResponse } from '../../common/type/response';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';
import { LogsService } from '../logs/logs.service';

@Controller('category')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Permissions('category:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.categoriesService.list(paginationDto);
      await this.logsService.createLog({ action: 'category:read', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Get all categories success', result.data, result.meta);
    } catch (err) {
      console.error('Failed get all categories', err);
      await this.logsService.createLog({ action: 'category:read', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.INTERNAL_SERVER_ERROR });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse('Failed to get categories', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @Permissions('category:create')
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.categoriesService.create(dto);
      await this.logsService.createLog({ action: 'category:create', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.CREATED });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Category created', created);
    } catch (err) {
      console.error('Failed create category', err);
      await this.logsService.createLog({ action: 'category:create', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.CONFLICT });
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse('Failed to create category', HttpStatus.CONFLICT);
    }
  }

  @Get(':id')
  @Permissions('category:read')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.categoriesService.detail(id);
      await this.logsService.createLog({ action: 'category:read', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Category detail', item);
    } catch (err) {
      console.error('Failed get category detail', err);
      await this.logsService.createLog({ action: 'category:read', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Category not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @Permissions('category:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.categoriesService.update(id, dto);
      await this.logsService.createLog({ action: 'category:update', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Category updated', updated);
    } catch (err) {
      console.error('Failed update category', err);
      await this.logsService.createLog({ action: 'category:update', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to update category', HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':id')
  @Permissions('category:delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.categoriesService.delete(id);
      await this.logsService.createLog({ action: 'category:delete', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Category deleted', true);
    } catch (err) {
      console.error('Failed delete category', err);
      await this.logsService.createLog({ action: 'category:delete', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to delete category', HttpStatus.NOT_FOUND);
    }
  }
}
