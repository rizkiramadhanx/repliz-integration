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

export const SCHEDULED_POST_STATUSES = [
  'draft',
  'scheduled',
  'publishing',
  'success',
  'failed',
  'cancelled',
] as const;
export type ScheduledPostStatus = (typeof SCHEDULED_POST_STATUSES)[number];

@Entity('scheduled_posts')
export class ScheduledPostEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'source_account_id', type: 'uuid', nullable: true })
  @Expose({ name: 'source_account_id' })
  sourceAccountId: string | null;

  @ManyToOne(() => AccountEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_account_id' })
  sourceAccount?: AccountEntity | null;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  @Expose({ name: 'source_url' })
  sourceUrl: string | null;

  @Column({ type: 'text', default: '' })
  @Expose({ name: 'caption' })
  caption: string;

  @Column({ name: 'media_path', type: 'text', nullable: true })
  @Expose({ name: 'media_path' })
  mediaPath: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  @Expose({ name: 'thumbnail_url' })
  thumbnailUrl: string | null;

  @Column({ name: 'is_video', default: false })
  @Expose({ name: 'is_video' })
  isVideo: boolean;

  @Column({ name: 'target_account_ids', type: 'jsonb', default: () => "'[]'" })
  @Expose({ name: 'target_account_ids' })
  targetAccountIds: string[];

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  @Expose({ name: 'scheduled_at' })
  scheduledAt: Date | null;

  @Column({ type: 'varchar', default: 'draft' })
  @Expose({ name: 'status' })
  status: ScheduledPostStatus;

  @Column({ name: 'job_id', type: 'text', nullable: true })
  @Expose({ name: 'job_id' })
  jobId: string | null;

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
