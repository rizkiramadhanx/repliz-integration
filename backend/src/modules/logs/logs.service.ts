import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntity } from './entities/log.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';

export interface CreateLogDto {
  action: string;
  userId?: string;
  status: string;
  statusCode?: number;
}

export interface FindAllLogsOptions extends PaginationDto {
  action?: string;
  user_id?: string;
  status?: string;
}

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async createLog(dto: CreateLogDto): Promise<LogEntity> {
    const log = this.logRepository.create({
      action: dto.action,
      userId: dto.userId ?? null,
      status: dto.status,
      statusCode: dto.statusCode != null ? String(dto.statusCode) : null,
    });
    return this.logRepository.save(log);
  }

  async findAll(
    paginationDto: PaginationDto,
    options?: { action?: string; user_id?: string; status?: string },
  ): Promise<{ data: LogEntity[]; meta: ResponseMeta }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const qb = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .select([
        'log.id',
        'log.action',
        'log.userId',
        'log.timestamp',
        'log.status',
        'log.statusCode',
        'user.id',
        'user.name',
        'user.email',
      ])
      .orderBy('log.timestamp', 'DESC')
      .skip(skip)
      .take(limit);

    if (options?.action?.trim()) {
      qb.andWhere('log.action ILIKE :action', {
        action: `%${options.action.trim()}%`,
      });
    }
    if (options?.user_id?.trim()) {
      qb.andWhere('log.user_id = :userId', { userId: options.user_id.trim() });
    }
    if (options?.status?.trim()) {
      qb.andWhere('log.status = :status', { status: options.status.trim() });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPage = Math.ceil(total / limit);
    const meta: ResponseMeta = { page, limit, total, total_page: totalPage };
    return { data, meta };
  }

  async findOne(id: string): Promise<LogEntity> {
    const log = await this.logRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!log) {
      throw new NotFoundException('Log not found');
    }
    return log;
  }
}
