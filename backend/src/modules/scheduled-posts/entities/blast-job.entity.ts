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

export const BLAST_JOB_STATUSES = [
  'running',
  'stopped',
  'completed',
  'failed',
] as const;
export type BlastJobStatus = (typeof BLAST_JOB_STATUSES)[number];

@Entity('blast_jobs')
export class BlastJobEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'facebook_account_id', type: 'uuid' })
  @Expose({ name: 'facebook_account_id' })
  facebookAccountId: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facebook_account_id' })
  facebookAccount?: AccountEntity;

  @Column({ name: 'media_path', type: 'text', nullable: true })
  @Expose({ name: 'media_path' })
  mediaPath: string | null;

  @Column({ type: 'text' })
  @Expose({ name: 'caption' })
  caption: string;

  @Column({ name: 'group_ids', type: 'jsonb' })
  @Expose({ name: 'group_ids' })
  groupIds: string[];

  @Column({ name: 'gap_minutes', type: 'int' })
  @Expose({ name: 'gap_minutes' })
  gapMinutes: number;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  @Expose({ name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ name: 'current_group_index', type: 'int', default: 0 })
  @Expose({ name: 'current_group_index' })
  currentGroupIndex: number;

  @Column({ type: 'varchar', default: 'running' })
  @Expose({ name: 'status' })
  status: BlastJobStatus;

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
