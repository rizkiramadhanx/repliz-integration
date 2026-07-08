import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { BlastJobEntity } from './entities/blast-job.entity';
import { BlastGroupResultEntity } from './entities/blast-group-result.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';
import { BLAST_QUEUE_NAME } from './worker/blast-queue.constants';
import { StartBlastDto } from './dto/blast.dto';

@Injectable()
export class BlastService {
  constructor(
    @InjectRepository(BlastJobEntity)
    private readonly blastRepo: Repository<BlastJobEntity>,
    @InjectRepository(BlastGroupResultEntity)
    private readonly resultRepo: Repository<BlastGroupResultEntity>,
    @InjectQueue(BLAST_QUEUE_NAME)
    private readonly blastQueue: Queue,
  ) {}

  private serializeBlast(row: BlastJobEntity) {
    return {
      id: row.id,
      facebook_account_id: row.facebookAccountId,
      media_path: row.mediaPath,
      caption: row.caption,
      group_ids: row.groupIds,
      gap_minutes: row.gapMinutes,
      scheduled_at: row.scheduledAt,
      current_group_index: row.currentGroupIndex,
      total_groups: row.groupIds.length,
      status: row.status,
      error_message: row.errorMessage,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeResult(row: BlastGroupResultEntity) {
    return {
      id: row.id,
      blast_job_id: row.blastJobId,
      group_id: row.groupId,
      status: row.status,
      error_message: row.errorMessage,
      created_at: row.createdAt,
    };
  }

  async startBlast(dto: StartBlastDto) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Waktu mulai tidak valid');
    }

    const row = this.blastRepo.create({
      facebookAccountId: dto.facebookAccountId,
      mediaPath: dto.mediaPath ?? null,
      caption: dto.caption,
      groupIds: dto.groupIds,
      gapMinutes: dto.gapMinutes,
      scheduledAt,
      currentGroupIndex: 0,
      status: 'running',
    });
    const saved = await this.blastRepo.save(row);

    const delayMs = Math.max(scheduledAt.getTime() - Date.now(), 0);
    await this.blastQueue.add(
      BLAST_QUEUE_NAME,
      { blastJobId: saved.id },
      { delay: delayMs },
    );

    return this.serializeBlast(saved);
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.blastRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    };
    return { data: rows.map((r) => this.serializeBlast(r)), meta };
  }

  async findOne(id: string) {
    const row = await this.blastRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Blast job not found');
    return this.serializeBlast(row);
  }

  async findResults(blastJobId: string) {
    const rows = await this.resultRepo.find({
      where: { blastJobId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => this.serializeResult(r));
  }

  async stop(id: string) {
    const row = await this.blastRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Blast job not found');
    if (row.status !== 'running') {
      throw new BadRequestException(
        'Hanya blast job berstatus running yang bisa dihentikan',
      );
    }
    await this.blastRepo.update(id, { status: 'stopped' });
    return this.findOne(id);
  }
}
