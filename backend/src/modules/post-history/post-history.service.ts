import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PostHistoryEntity,
  PostHistoryMediaType,
  PostHistoryStatus,
  PostHistoryTriggerSource,
} from './entities/post-history.entity';
import { AutoPostTarget } from '../auto-post-rules/entities/auto-post-rule.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';

export type CreatePostHistoryInput = {
  ruleId: string | null;
  ruleName: string | null;
  targetAccountId: string | null;
  platform: AutoPostTarget;
  targetRef?: string | null;
  mediaType: PostHistoryMediaType;
  triggerSource: PostHistoryTriggerSource;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  caption?: string | null;
  postUrl?: string | null;
  status: PostHistoryStatus;
  errorMessage?: string | null;
};

export type FindAllPostHistoryFilters = {
  ruleId?: string;
  status?: PostHistoryStatus;
  platform?: AutoPostTarget;
};

export type UpdatePostHistoryInput = Partial<{
  status: PostHistoryStatus;
  postUrl: string | null;
  errorMessage: string | null;
  attempts: number;
}>;

@Injectable()
export class PostHistoryService {
  constructor(
    @InjectRepository(PostHistoryEntity)
    private readonly postHistoryRepo: Repository<PostHistoryEntity>,
  ) {}

  private serialize(row: PostHistoryEntity) {
    return {
      id: row.id,
      rule_id: row.ruleId,
      rule_name: row.ruleName,
      target_account_id: row.targetAccountId,
      target_account: row.targetAccount
        ? { label: row.targetAccount.label, type: row.targetAccount.type }
        : null,
      platform: row.platform,
      target_ref: row.targetRef,
      media_type: row.mediaType,
      trigger_source: row.triggerSource,
      source_label: row.sourceLabel,
      source_url: row.sourceUrl,
      caption: row.caption,
      post_url: row.postUrl,
      status: row.status,
      attempts: row.attempts,
      error_message: row.errorMessage,
      posted_at: row.postedAt,
      updated_at: row.updatedAt,
    };
  }

  async create(input: CreatePostHistoryInput): Promise<PostHistoryEntity> {
    const row = this.postHistoryRepo.create({
      ruleId: input.ruleId,
      ruleName: input.ruleName,
      targetAccountId: input.targetAccountId,
      platform: input.platform,
      targetRef: input.targetRef ?? null,
      mediaType: input.mediaType,
      triggerSource: input.triggerSource,
      sourceLabel: input.sourceLabel ?? null,
      sourceUrl: input.sourceUrl ?? null,
      caption: input.caption ?? null,
      postUrl: input.postUrl ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    });
    return this.postHistoryRepo.save(row);
  }

  async update(id: string, patch: UpdatePostHistoryInput): Promise<void> {
    await this.postHistoryRepo.update(id, patch);
  }

  /**
   * Sama seperti update(), tapi hanya menimpa row yang statusnya masih
   * 'pending' — mencegah event BullMQ (completed/failed) yang datang
   * terlambat menimpa row yang sudah di-declare 'failed' secara manual
   * lewat tombol "Hentikan Proses".
   */
  async updateIfStillPending(
    id: string,
    patch: UpdatePostHistoryInput,
  ): Promise<void> {
    await this.postHistoryRepo.update({ id, status: 'pending' }, patch);
  }

  async hasPendingForRule(ruleId: string): Promise<boolean> {
    const count = await this.postHistoryRepo.count({
      where: { ruleId, status: 'pending' },
    });
    return count > 0;
  }

  async markAllPendingAsFailed(errorMessage: string): Promise<void> {
    await this.postHistoryRepo.update(
      { status: 'pending' },
      { status: 'failed', errorMessage },
    );
  }

  async findAll(pagination: PaginationDto, filters: FindAllPostHistoryFilters) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.postHistoryRepo
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.targetAccount', 'targetAccount')
      .orderBy('history.postedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.ruleId) {
      qb.andWhere('history.ruleId = :ruleId', { ruleId: filters.ruleId });
    }
    if (filters.status) {
      qb.andWhere('history.status = :status', { status: filters.status });
    }
    if (filters.platform) {
      qb.andWhere('history.platform = :platform', {
        platform: filters.platform,
      });
    }

    const [rows, total] = await qb.getManyAndCount();

    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    };

    return { data: rows.map((r) => this.serialize(r)), meta };
  }
}
