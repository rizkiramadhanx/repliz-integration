import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { join } from 'path';
import { Repository } from 'typeorm';
import {
  ScheduledPostEntity,
  ScheduledPostStatus,
} from './entities/scheduled-post.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';
import { deleteFile } from '../auto-post-rules/worker/media.util';
import { SCHEDULED_POST_QUEUE_NAME } from './worker/scheduled-post-queue.constants';
import {
  GenerateFromLinkDto,
  UpdateScheduledPostDraftDto,
} from './dto/scheduled-post.dto';
import { scrapeInstagramPostByUrl } from '../auto-post-rules/worker/instagram-scraper.util';

const EDITABLE_STATUSES: ScheduledPostStatus[] = ['draft', 'scheduled'];

export type BulkActionResult = {
  succeeded: string[];
  failed: { id: string; message: string }[];
};

@Injectable()
export class ScheduledPostsService {
  constructor(
    @InjectRepository(ScheduledPostEntity)
    private readonly repo: Repository<ScheduledPostEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectQueue(SCHEDULED_POST_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  private serialize(row: ScheduledPostEntity) {
    return {
      id: row.id,
      source_account_id: row.sourceAccountId,
      source_url: row.sourceUrl,
      caption: row.caption,
      media_path: row.mediaPath,
      thumbnail_url: row.thumbnailUrl,
      is_video: row.isVideo,
      target_account_ids: row.targetAccountIds,
      scheduled_at: row.scheduledAt,
      status: row.status,
      job_id: row.jobId,
      error_message: row.errorMessage,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async findAll(
    pagination: PaginationDto,
    filters: { startDate?: string; endDate?: string },
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('post')
      .orderBy('post.scheduledAt', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.startDate) {
      qb.andWhere('post.scheduledAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('post.scheduledAt <= :endDate', { endDate: filters.endDate });
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

  async findOneOrFail(id: string): Promise<ScheduledPostEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Scheduled post not found');
    return row;
  }

  async getOneForResponse(id: string) {
    return this.serialize(await this.findOneOrFail(id));
  }

  async createDraft(caption: string | undefined, file?: Express.Multer.File) {
    const row = this.repo.create({
      caption: caption ?? '',
      mediaPath: file ? `scheduled-post-media/${file.filename}` : null,
      isVideo: file ? file.mimetype.startsWith('video/') : false,
      targetAccountIds: [],
      status: 'draft',
    });
    const saved = await this.repo.save(row);
    return this.serialize(saved);
  }

  async updateDraft(
    id: string,
    dto: UpdateScheduledPostDraftDto,
    file?: Express.Multer.File,
  ) {
    const row = await this.findOneOrFail(id);
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        `Draft dengan status ${row.status} tidak bisa diedit`,
      );
    }

    if (dto.caption !== undefined) row.caption = dto.caption;

    if (dto.targetAccountIds !== undefined) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(dto.targetAccountIds);
      } catch {
        throw new BadRequestException(
          'targetAccountIds harus berupa JSON array string',
        );
      }
      if (
        !Array.isArray(parsed) ||
        !parsed.every((v) => typeof v === 'string')
      ) {
        throw new BadRequestException(
          'targetAccountIds harus array of string (uuid)',
        );
      }
      row.targetAccountIds = parsed;
    }

    if (file) {
      if (row.mediaPath) {
        deleteFile(join(process.cwd(), 'uploads', row.mediaPath));
      }
      row.mediaPath = `scheduled-post-media/${file.filename}`;
      row.isVideo = file.mimetype.startsWith('video/');
    }

    const saved = await this.repo.save(row);
    return this.serialize(saved);
  }

  async generateFromLink(dto: GenerateFromLinkDto) {
    const browsingAccount = await this.accountRepo.findOne({
      where: { id: dto.sourceAccountId },
    });
    if (!browsingAccount) {
      throw new BadRequestException('Akun browsing tidak ditemukan');
    }

    const scraped = await scrapeInstagramPostByUrl(
      browsingAccount,
      dto.sourceUrl,
    );
    if (!scraped) {
      throw new BadRequestException(
        'Post tidak ditemukan atau gagal diekstrak medianya',
      );
    }

    const row = this.repo.create({
      sourceAccountId: dto.sourceAccountId,
      sourceUrl: dto.sourceUrl,
      caption: scraped.caption,
      mediaPath: null,
      thumbnailUrl: scraped.thumbnailUrl,
      isVideo: scraped.isVideo,
      targetAccountIds: [],
      status: 'draft',
    });
    const saved = await this.repo.save(row);
    return this.serialize(saved);
  }

  private async cancelJobIfExists(jobId: string | null): Promise<void> {
    if (!jobId) return;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove().catch(() => undefined);
    }
  }

  private assertSchedulable(row: ScheduledPostEntity): void {
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        `Post dengan status ${row.status} tidak bisa dijadwalkan`,
      );
    }
    if (!row.mediaPath && !row.sourceUrl) {
      throw new BadRequestException(
        'Draft belum punya media atau sumber Instagram',
      );
    }
    if (!row.targetAccountIds || row.targetAccountIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu akun target');
    }
  }

  async schedule(id: string, scheduledAtIso: string) {
    const row = await this.findOneOrFail(id);
    this.assertSchedulable(row);

    const scheduledAt = new Date(scheduledAtIso);
    const delayMs = scheduledAt.getTime() - Date.now();
    if (isNaN(scheduledAt.getTime()) || delayMs <= 0) {
      throw new BadRequestException(
        'scheduledAt harus berupa tanggal valid di masa depan',
      );
    }

    await this.cancelJobIfExists(row.jobId);

    const job = await this.queue.add(
      SCHEDULED_POST_QUEUE_NAME,
      { scheduledPostId: id },
      { delay: delayMs },
    );

    await this.repo.update(id, {
      status: 'scheduled',
      scheduledAt,
      jobId: job.id,
      errorMessage: null,
    });

    return this.getOneForResponse(id);
  }

  async publishNowById(id: string): Promise<void> {
    const row = await this.findOneOrFail(id);
    this.assertSchedulable(row);

    await this.cancelJobIfExists(row.jobId);

    // Update DB dulu SEBELUM enqueue — mencegah race condition di mana job
    // delay-0 sempat diproses worker sebelum status di DB ter-update.
    await this.repo.update(id, {
      status: 'scheduled',
      scheduledAt: new Date(),
      errorMessage: null,
    });

    const job = await this.queue.add(
      SCHEDULED_POST_QUEUE_NAME,
      { scheduledPostId: id },
      { delay: 0 },
    );

    await this.repo.update(id, { jobId: job.id });
  }

  async cancelById(id: string) {
    const row = await this.findOneOrFail(id);
    if (row.status !== 'scheduled') {
      throw new BadRequestException(
        'Hanya post berstatus scheduled yang bisa dibatalkan',
      );
    }

    await this.cancelJobIfExists(row.jobId);
    await this.repo.update(id, {
      status: 'draft',
      jobId: null,
      scheduledAt: null,
    });

    return this.getOneForResponse(id);
  }

  async deleteById(id: string): Promise<void> {
    const row = await this.findOneOrFail(id);
    if (row.status === 'scheduled' && row.jobId) {
      await this.cancelJobIfExists(row.jobId);
    }
    if (row.mediaPath) {
      deleteFile(join(process.cwd(), 'uploads', row.mediaPath));
    }
    await this.repo.delete(id);
  }

  async bulkPublishNow(ids: string[]): Promise<BulkActionResult> {
    const results = await Promise.all(
      ids.map((id) =>
        this.publishNowById(id)
          .then(() => ({ id, ok: true as const }))
          .catch((err) => ({
            id,
            ok: false as const,
            message: err instanceof Error ? err.message : 'Unknown error',
          })),
      ),
    );
    return {
      succeeded: results.filter((r) => r.ok).map((r) => r.id),
      failed: results
        .filter((r): r is { id: string; ok: false; message: string } => !r.ok)
        .map((r) => ({ id: r.id, message: r.message })),
    };
  }

  async bulkDelete(ids: string[]): Promise<BulkActionResult> {
    const results = await Promise.all(
      ids.map((id) =>
        this.deleteById(id)
          .then(() => ({ id, ok: true as const }))
          .catch((err) => ({
            id,
            ok: false as const,
            message: err instanceof Error ? err.message : 'Unknown error',
          })),
      ),
    );
    return {
      succeeded: results.filter((r) => r.ok).map((r) => r.id),
      failed: results
        .filter((r): r is { id: string; ok: false; message: string } => !r.ok)
        .map((r) => ({ id: r.id, message: r.message })),
    };
  }

  async getLastScheduledAtByAccount(accountId: string): Promise<Date | null> {
    const row = await this.repo
      .createQueryBuilder('post')
      .where(`post.target_account_ids::jsonb @> :id::jsonb`, {
        id: JSON.stringify([accountId]),
      })
      .andWhere('post.status IN (:...statuses)', {
        statuses: ['scheduled', 'publishing', 'success'],
      })
      .orderBy('post.scheduledAt', 'DESC')
      .limit(1)
      .getOne();
    return row?.scheduledAt ?? null;
  }
}
