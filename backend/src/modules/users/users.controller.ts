import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  HttpStatus,
  Res,
  Query,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { UserService } from './users.service';
import { Response } from 'express';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from './dto/base-user.dto';
import { UpdateUserDto } from './dto/create-user.dto';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';
import { LogsService } from '../logs/logs.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UserService,
    private readonly logsService: LogsService,
  ) {}

  @Permissions('user:read', 'option:user')
  @Get()
  async getAllProfile(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.usersService.getAllUser(paginationDto);
      await this.logsService.createLog({
        action: 'user:read',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get All user success',
        result.data,
        result.meta,
      );
    } catch (err) {
      await this.logsService.createLog({
        action: 'user:read',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Permissions('user:read')
  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.usersService.getUserById(id);
      await this.logsService.createLog({
        action: 'user:read',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Get user success', user);
    } catch (err) {
      console.error('Failed get user by id', err);
      await this.logsService.createLog({
        action: 'user:read',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.NOT_FOUND,
      });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('User not found', HttpStatus.NOT_FOUND);
    }
  }

  @Permissions('user:create')
  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.usersService.createUser(createUserDto);
      await this.logsService.createLog({
        action: 'user:create',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.CREATED,
      });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('User created successfully', user);
    } catch (err) {
      console.error('Failed create user', err);
      await this.logsService.createLog({
        action: 'user:create',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.CONFLICT,
      });
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse('Failed to create user', HttpStatus.CONFLICT);
    }
  }

  @Permissions('user:update')
  @Put(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.usersService.updateUser(id, updateUserDto);
      await this.logsService.createLog({
        action: 'user:update',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('User updated successfully', user);
    } catch (err) {
      console.error('Failed update user', err);
      await this.logsService.createLog({
        action: 'user:update',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.NOT_FOUND,
      });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to update user', HttpStatus.NOT_FOUND);
    }
  }

  @Permissions('user:delete')
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.usersService.deleteUser(id);
      await this.logsService.createLog({
        action: 'user:delete',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('User deleted successfully', result);
    } catch (err) {
      console.error('Failed delete user', err);
      await this.logsService.createLog({
        action: 'user:delete',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.NOT_FOUND,
      });
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Failed to delete user', HttpStatus.NOT_FOUND);
    }
  }
}
