import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntity } from './entities/log.entity';

/**
 * Cron: hapus log yang timestamp-nya sebelum H-7 (lebih dari 7 hari lalu).
 * Jalan setiap hari jam 00:00.
 */
@Injectable()
export class LogsCron {
  constructor(
    @InjectRepository(LogEntity)
    private readonly logRepo: Repository<LogEntity>,
  ) {}

  @Cron('0 0 * * *')
  async deleteOldLogs(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    await this.logRepo
      .createQueryBuilder()
      .delete()
      .from(LogEntity)
      .where('timestamp < :cutoff', { cutoff })
      .execute();
  }
}
