import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from './entities/account.entity';
import { AccountDelegationEntity } from './entities/account-delegation.entity';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';
import { TelegramPublisher } from './publishers/telegram.publisher';
import { ConnectionCheckService } from './connection-check/connection-check.service';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(AccountDelegationEntity)
    private readonly delegationRepo: Repository<AccountDelegationEntity>,
    private readonly telegramPublisher: TelegramPublisher,
    private readonly connectionCheckService: ConnectionCheckService,
  ) {}

  private serialize(account: AccountEntity) {
    return {
      id: account.id,
      label: account.label,
      type: account.type,
      is_active: account.isActive,
      connection_status: account.connectionStatus,
      connection_error: account.connectionError,
      last_checked_at: account.lastCheckedAt,
      created_at: account.createdAt,
      updated_at: account.updatedAt,
    };
  }

  async hasAccess(accountId: string, userId: string): Promise<boolean> {
    const delegation = await this.delegationRepo.findOne({
      where: { accountId, userId },
    });
    return !!delegation;
  }

  private async assertHasAccess(
    accountId: string,
    userId: string,
  ): Promise<void> {
    const has = await this.hasAccess(accountId, userId);
    if (!has) {
      throw new ForbiddenException('You do not have access to this account');
    }
  }

  async create(dto: CreateAccountDto, creatorUserId: string) {
    const account = this.accountRepo.create(dto);
    const saved = await this.accountRepo.save(account);

    // Pembuat otomatis mendapat akses ke akun yang baru dibuat
    await this.delegationRepo.save(
      this.delegationRepo.create({
        accountId: saved.id,
        userId: creatorUserId,
      }),
    );

    return this.serialize(saved);
  }

  async listForUser(userId: string, isAdmin: boolean, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.accountRepo
      .createQueryBuilder('account')
      .orderBy('account.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (!isAdmin) {
      qb.innerJoin(
        'account.delegations',
        'delegation',
        'delegation.userId = :userId',
        { userId },
      );
    }

    const [accounts, total] = await qb.getManyAndCount();

    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    };

    return { data: accounts.map((a) => this.serialize(a)), meta };
  }

  async getOneForUser(id: string, userId: string, isAdmin: boolean) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');

    if (!isAdmin) {
      await this.assertHasAccess(id, userId);
    }

    return this.serialize(account);
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');

    if (!isAdmin) {
      await this.assertHasAccess(id, userId);
    }

    Object.assign(account, dto);
    const saved = await this.accountRepo.save(account);
    return this.serialize(saved);
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');

    if (!isAdmin) {
      await this.assertHasAccess(id, userId);
    }

    await this.accountRepo.delete(id);
    return true;
  }

  // --- Delegation management ---
  // Siapa saja yang sudah didelegasikan ke akun ini bebas mengelola delegasi
  // lain (tambah/cabut) — tidak ada hierarki/level akses.

  async listDelegations(accountId: string, userId: string, isAdmin: boolean) {
    if (!isAdmin) {
      await this.assertHasAccess(accountId, userId);
    }

    const delegations = await this.delegationRepo.find({
      where: { accountId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return delegations.map((d) => ({
      id: d.id,
      user_id: d.userId,
      created_at: d.createdAt,
      user: d.user
        ? {
            id: d.user.id,
            email: d.user.email,
            name: d.user.name,
          }
        : null,
    }));
  }

  async delegate(
    accountId: string,
    targetUserId: string,
    actingUserId: string,
    isAdmin: boolean,
  ) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Account not found');

    if (!isAdmin) {
      await this.assertHasAccess(accountId, actingUserId);
    }

    const existing = await this.delegationRepo.findOne({
      where: { accountId, userId: targetUserId },
    });
    if (existing) {
      throw new ConflictException('User already has access to this account');
    }

    const delegation = this.delegationRepo.create({
      accountId,
      userId: targetUserId,
    });
    await this.delegationRepo.save(delegation);
    return true;
  }

  async revokeDelegation(
    accountId: string,
    delegationId: string,
    actingUserId: string,
    isAdmin: boolean,
  ) {
    if (!isAdmin) {
      await this.assertHasAccess(accountId, actingUserId);
    }

    const delegation = await this.delegationRepo.findOne({
      where: { id: delegationId, accountId },
    });
    if (!delegation) throw new NotFoundException('Delegation not found');

    await this.delegationRepo.delete(delegationId);
    return true;
  }

  // --- Platform publishing ---

  async publishToTelegram(
    accountId: string,
    userId: string,
    isAdmin: boolean,
    options: { text: string; mediaPath?: string },
  ) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Account not found');

    if (account.type !== 'telegram') {
      throw new BadRequestException('Account is not a Telegram account');
    }

    if (!isAdmin) {
      await this.assertHasAccess(accountId, userId);
    }

    return this.telegramPublisher.publish(account, options);
  }

  async checkConnection(accountId: string, userId: string, isAdmin: boolean) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Account not found');

    if (!isAdmin) {
      await this.assertHasAccess(accountId, userId);
    }

    const result = await this.connectionCheckService.check(account);

    account.connectionStatus = result.ok ? 'connected' : 'error';
    account.connectionError = result.ok ? null : (result.error ?? null);
    account.lastCheckedAt = new Date();
    if (result.ok && result.username) {
      account.credentials = {
        ...account.credentials,
        username: result.username,
      };
    }
    await this.accountRepo.save(account);

    return result;
  }
}
