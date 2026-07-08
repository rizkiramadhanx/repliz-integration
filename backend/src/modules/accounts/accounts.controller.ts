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
import { AccountsService } from './accounts.service';
import {
  CreateAccountDto,
  DelegateAccountDto,
  PublishTelegramDto,
  UpdateAccountDto,
} from './dto/account.dto';
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

function isAdmin(user: CurrentUserType): boolean {
  return user?.role?.name === 'Admin';
}

@Controller('account')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Permissions('account:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.accountsService.listForUser(
        currentUser.id,
        isAdmin(currentUser),
        paginationDto,
      );
      await this.logsService.createLog({
        action: 'account:read',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse(
        'Get all accounts success',
        result.data,
        result.meta,
      );
    } catch (err) {
      console.error('Failed get all accounts', err);
      await this.logsService.createLog({
        action: 'account:read',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse(
        'Failed to get accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Permissions('account:create')
  async create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const created = await this.accountsService.create(dto, currentUser.id);
      await this.logsService.createLog({
        action: 'account:create',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.CREATED,
      });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Account created', created);
    } catch (err) {
      console.error('Failed create account', err);
      await this.logsService.createLog({
        action: 'account:create',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.CONFLICT,
      });
      res.status(HttpStatus.CONFLICT);
      return createErrorResponse(
        'Failed to create account',
        HttpStatus.CONFLICT,
      );
    }
  }

  @Get(':accountId')
  @Permissions('account:read')
  async detail(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const item = await this.accountsService.getOneForUser(
        accountId,
        currentUser.id,
        isAdmin(currentUser),
      );
      res.status(HttpStatus.OK);
      return createSuccessResponse('Account detail', item);
    } catch (err) {
      console.error('Failed get account detail', err);
      res.status(HttpStatus.NOT_FOUND);
      return createErrorResponse('Account not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':accountId')
  @Permissions('account:update')
  async update(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const updated = await this.accountsService.update(
        accountId,
        dto,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'account:update',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Account updated', updated);
    } catch (err) {
      console.error('Failed update account', err);
      await this.logsService.createLog({
        action: 'account:update',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.FORBIDDEN,
      });
      res.status(HttpStatus.FORBIDDEN);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to update account',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  @Delete(':accountId')
  @Permissions('account:delete')
  async remove(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.accountsService.remove(
        accountId,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'account:delete',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Account deleted', true);
    } catch (err) {
      console.error('Failed delete account', err);
      await this.logsService.createLog({
        action: 'account:delete',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.FORBIDDEN,
      });
      res.status(HttpStatus.FORBIDDEN);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to delete account',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // --- Delegation endpoints ---

  @Get(':accountId/delegations')
  @Permissions('account:read')
  async listDelegations(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const delegations = await this.accountsService.listDelegations(
        accountId,
        currentUser.id,
        isAdmin(currentUser),
      );
      res.status(HttpStatus.OK);
      return createSuccessResponse('Delegation list', delegations);
    } catch (err) {
      console.error('Failed list delegations', err);
      res.status(HttpStatus.FORBIDDEN);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to list delegations',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  @Post(':accountId/delegations')
  @Permissions('account:update')
  async delegate(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: DelegateAccountDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.accountsService.delegate(
        accountId,
        dto.userId,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'account:delegate',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.CREATED,
      });
      res.status(HttpStatus.CREATED);
      return createSuccessResponse('Account delegated', true);
    } catch (err) {
      console.error('Failed delegate account', err);
      await this.logsService.createLog({
        action: 'account:delegate',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.FORBIDDEN,
      });
      res.status(HttpStatus.FORBIDDEN);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to delegate account',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  @Delete(':accountId/delegations/:delegationId')
  @Permissions('account:update')
  async revokeDelegation(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('delegationId', ParseUUIDPipe) delegationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.accountsService.revokeDelegation(
        accountId,
        delegationId,
        currentUser.id,
        isAdmin(currentUser),
      );
      await this.logsService.createLog({
        action: 'account:revoke_delegation',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Delegation revoked', true);
    } catch (err) {
      console.error('Failed revoke delegation', err);
      res.status(HttpStatus.FORBIDDEN);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to revoke delegation',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // --- Telegram publishing (official Bot API) ---

  @Post(':accountId/telegram/publish')
  @Permissions('account:publish')
  async publishTelegram(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: PublishTelegramDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.accountsService.publishToTelegram(
        accountId,
        currentUser.id,
        isAdmin(currentUser),
        dto,
      );
      await this.logsService.createLog({
        action: 'account:publish',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Published to Telegram', result);
    } catch (err) {
      console.error('Failed publish to Telegram', err);
      await this.logsService.createLog({
        action: 'account:publish',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
      });
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to publish to Telegram',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // --- Facebook: daftar grup yang diikuti akun ---

  @Post(':accountId/facebook/my-groups')
  @Permissions('account:read')
  async listFacebookGroups(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const groups = await this.accountsService.listFacebookGroups(
        accountId,
        currentUser.id,
        isAdmin(currentUser),
      );
      res.status(HttpStatus.OK);
      return createSuccessResponse('Facebook groups fetched', groups);
    } catch (err) {
      console.error('Failed list facebook groups', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to list facebook groups',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // --- Connection check (semua tipe akun: Telegram, Discord, Twitter, Facebook, Instagram) ---

  @Post(':accountId/check-connection')
  @Permissions('account:read')
  async checkConnection(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.accountsService.checkConnection(
        accountId,
        currentUser.id,
        isAdmin(currentUser),
      );
      res.status(HttpStatus.OK);
      return createSuccessResponse('Connection checked', result);
    } catch (err) {
      console.error('Failed check connection', err);
      res.status(HttpStatus.BAD_REQUEST);
      return createErrorResponse(
        err instanceof Error ? err.message : 'Failed to check connection',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
