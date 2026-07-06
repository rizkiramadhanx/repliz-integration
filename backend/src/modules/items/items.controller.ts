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
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createErrorResponse, createSuccessResponse } from '../../common/type/response';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';
import { LogsService } from '../logs/logs.service';

@Controller('item')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Permissions('item:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.itemsService.list(paginationDto);
      await this.logsService.createLog({ action: 'item:read', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Get all items success', result.data, result.meta);
    } catch (err) {
      console.error('Failed get all items', err);
      await this.logsService.createLog({ action: 'item:read', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.INTERNAL_SERVER_ERROR });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse('Failed to get items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @Permissions('item:create')
  async create(
    @Body() dto: CreateItemDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.itemsService.create(dto);
      await this.logsService.createLog({ action: 'item:create', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.CREATED });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Item created', created);
    } catch (err) {
      console.error('Failed create item', err);
      await this.logsService.createLog({ action: 'item:create', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.CONFLICT });
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse('Failed to create item', HttpStatus.CONFLICT);
    }
  }

  @Get(':id')
  @Permissions('item:read')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.itemsService.detail(id);
      await this.logsService.createLog({ action: 'item:read', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Item detail', item);
    } catch (err) {
      console.error('Failed get item detail', err);
      await this.logsService.createLog({ action: 'item:read', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Item not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @Permissions('item:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.itemsService.update(id, dto);
      await this.logsService.createLog({ action: 'item:update', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Item updated', updated);
    } catch (err) {
      console.error('Failed update item', err);
      await this.logsService.createLog({ action: 'item:update', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to update item', HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':id')
  @Permissions('item:delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.itemsService.delete(id);
      await this.logsService.createLog({ action: 'item:delete', userId: currentUser.id, status: 'SUCCESS', statusCode: HttpStatus.OK });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Item deleted', true);
    } catch (err) {
      console.error('Failed delete item', err);
      await this.logsService.createLog({ action: 'item:delete', userId: currentUser?.id, status: 'ERROR', statusCode: HttpStatus.NOT_FOUND });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to delete item', HttpStatus.NOT_FOUND);
    }
  }
}
