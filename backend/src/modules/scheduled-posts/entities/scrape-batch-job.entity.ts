import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { AccountEntity } from '../../accounts/entities/account.entity';

export const SCRAPE_BATCH_STATUSES = [
  'running',
  'stopped',
  'completed',
  'failed',
] as const;
export type ScrapeBatchStatus = (typeof SCRAPE_BATCH_STATUSES)[number];

@Entity('scrape_batch_jobs')
export class ScrapeBatchJobEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'source_account_id', type: 'uuid' })
  @Expose({ name: 'source_account_id' })
  sourceAccountId: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_account_id' })
  sourceAccount?: AccountEntity;

  @Column({ name: 'target_username', length: 255 })
  @Expose({ name: 'target_username' })
  targetUsername: string;

  @Column({ name: 'batch_size', type: 'int', default: 10 })
  @Expose({ name: 'batch_size' })
  batchSize: number;

  @Column({ name: 'total_limit', type: 'int' })
  @Expose({ name: 'total_limit' })
  totalLimit: number;

  @Column({ name: 'scrape_mode', type: 'varchar', default: 'posts' })
  @Expose({ name: 'scrape_mode' })
  scrapeMode: 'posts' | 'reels';

  @Column({ name: 'fetched_count', type: 'int', default: 0 })
  @Expose({ name: 'fetched_count' })
  fetchedCount: number;

  @Column({ type: 'varchar', default: 'running' })
  @Expose({ name: 'status' })
  status: ScrapeBatchStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  @Expose({ name: 'error_message' })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
