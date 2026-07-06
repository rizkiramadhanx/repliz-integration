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
import { AutoPostRulesService } from './auto-post-rules.service';
import {
  CreateAutoPostRuleDto,
  UpdateAutoPostRuleDto,
} from './dto/auto-post-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import { CurrentUser, CurrentUserType } from '../../security/user.decorator';
import { LogsService } from '../logs/logs.service';
import { PublishTargetsService } from './worker/publish-targets';

function isAdmin(user: CurrentUserType): boolean {
  return user?.role?.name === 'Admin';
}

@Controller('auto-post-rule')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutoPostRulesController {
  constructor(
    private readonly autoPostRulesService: AutoPostRulesService,
    private readonly logsService: LogsService,
    private readonly publishTargetsService: PublishTargetsService,
  ) {}

  @Get('queue-status')
  @Permissions('auto-post-rule:read')
  async queueStatus(@Res({ passthrough: true }) res: Response) {
    try {
      const counts = await this.publishTargetsService.getQueueCounts();
      res.status(HttpStatus.OK);
      return createSuccessResponse('Queue status', counts);
    } catch (err) {
      console.error('Failed get queue status', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get queue status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('queue-status/stop')
  @Permissions('auto-post-rule:run')
  async stopQueue(@Res({ passthrough: true }) res: Response) {
    try {
      await this.publishTargetsService.stopQueue();
      res.status(HttpStatus.OK);
      return createSuccessResponse('Antrian publish dihentikan', true);
    } catch (err) {
      console.error('Failed stop queue', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to stop queue',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Permissions('auto-post-rule:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.autoPostRulesService.listForUser(
        currentUser.id,
        isAdmin(currentUser),
        paginationDto,
      );
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get all auto post rules success',
        result.data,
        result.meta,
      );
    } catch (err) {
      console.error('Failed get all auto post rules', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get auto post rules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Permissions('auto-post-rule:create')
  async create(
    @Body() dto: CreateAutoPostRuleDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.autoPostRulesService.create(
        dto,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'auto-post-rule:create',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.CREATED,
      });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Auto post rule created', created);
    } catch (err) {
      console.error('Failed create auto post rule', err);
      await this.logsService.createLog({
        action: 'auto-post-rule:create',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
      });
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to create auto post rule',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':ruleId')
  @Permissions('auto-post-rule:read')
  async detail(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.autoPostRulesService.getOneForUser(
        ruleId,
        currentUser.id,
        isAdmin(currentUser),
      );
      res.status(HttpStatus.OK);
      return createSuccessResponse('Auto post rule detail', item);
    } catch (err) {
      console.error('Failed get auto post rule detail', err);
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse(
        'Auto post rule not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':ruleId')
  @Permissions('auto-post-rule:update')
  async update(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateAutoPostRuleDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.autoPostRulesService.update(
        ruleId,
        dto,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'auto-post-rule:update',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Auto post rule updated', updated);
    } catch (err) {
      console.error('Failed update auto post rule', err);
      await this.logsService.createLog({
        action: 'auto-post-rule:update',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
      });
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to update auto post rule',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':ruleId')
  @Permissions('auto-post-rule:delete')
  async remove(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.autoPostRulesService.remove(
        ruleId,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'auto-post-rule:delete',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Auto post rule deleted', true);
    } catch (err) {
      console.error('Failed delete auto post rule', err);
      await this.logsService.createLog({
        action: 'auto-post-rule:delete',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.FORBIDDEN,
      });
      res.status(HttpStatus.FORBIDDEN);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to delete auto post rule',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  @Post(':ruleId/run-now')
  @Permissions('auto-post-rule:run')
  async runNow(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.autoPostRulesService.runNow(
        ruleId,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'auto-post-rule:run',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Auto post rule dijalankan', true);
    } catch (err) {
      console.error('Failed run auto post rule', err);
      await this.logsService.createLog({
        action: 'auto-post-rule:run',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
      });
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to run auto post rule',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
