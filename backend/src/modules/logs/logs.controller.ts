import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LogsService } from './logs.service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';

@Controller('log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Permissions('log:read')
  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() _currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
    @Query('action') action?: string,
    @Query('user_id') userId?: string,
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.logsService.findAll(paginationDto, {
        action,
        user_id: userId,
        status,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get all logs success',
        result.data,
        result.meta,
      );
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Permissions('log:read')
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const log = await this.logsService.findOne(id);
      res.status(HttpStatus.OK);
      return createSuccessResponse('Get log success', log);
    } catch (err) {
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Log not found', HttpStatus.NOT_FOUND);
    }
  }
}
