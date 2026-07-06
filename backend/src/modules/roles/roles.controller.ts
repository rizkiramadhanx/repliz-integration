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
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import ACTION_ROLES from 'src/constant/action-roles';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';
import { LogsService } from '../logs/logs.service';

@Controller('role')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Permissions('role:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.rolesService.list(paginationDto);
      await this.logsService.createLog({
        action: 'role:read',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get all roles success',
        result.data,
        result.meta,
      );
    } catch (err) {
      console.error('Failed get all roles', err);
      await this.logsService.createLog({
        action: 'role:read',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get roles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('list-action')
  async listRoles(@CurrentUser() currentUser: CurrentUserType) {
    await this.logsService.createLog({
      action: 'role:list-action',
      userId: currentUser.id,
      status: 'SUCCESS',
      statusCode: HttpStatus.OK,
    });
    return {
      status: HttpStatus.OK,
      message: 'Action list',
      data: ACTION_ROLES,
    };
  }

  @Post()
  @Permissions('role:create')
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.rolesService.create(dto);
      await this.logsService.createLog({
        action: 'role:create',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.CREATED,
      });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Role created', created);
    } catch (err) {
      console.error('Failed create role', err);
      await this.logsService.createLog({
        action: 'role:create',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.CONFLICT,
      });
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse('Failed to create role', HttpStatus.CONFLICT);
    }
  }

  @Get(':roleId')
  @Permissions('role:read')
  async detail(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.rolesService.detailRole(roleId);
      await this.logsService.createLog({
        action: 'role:read',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Role detail', item);
    } catch (err) {
      console.error('Failed get role detail', err);
      await this.logsService.createLog({
        action: 'role:read',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.NOT_FOUND,
      });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Role not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':roleId')
  @Permissions('role:update')
  async update(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.rolesService.updateRole(roleId, dto);
      await this.logsService.createLog({
        action: 'role:update',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Role updated', updated);
    } catch (err) {
      console.error('Failed update role', err);
      await this.logsService.createLog({
        action: 'role:update',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.NOT_FOUND,
      });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to update role', HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':roleId')
  @Permissions('role:delete')
  async remove(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.rolesService.deleteRole(roleId);
      await this.logsService.createLog({
        action: 'role:delete',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Role deleted', true);
    } catch (err) {
      console.error('Failed delete role', err);
      await this.logsService.createLog({
        action: 'role:delete',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.NOT_FOUND,
      });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to delete role', HttpStatus.NOT_FOUND);
    }
  }
}
