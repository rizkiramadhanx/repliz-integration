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
import { AutoPostTarget } from '../../auto-post-rules/entities/auto-post-rule.entity';

export const POST_HISTORY_MEDIA_TYPES = ['text', 'photo', 'video'] as const;
export type PostHistoryMediaType = (typeof POST_HISTORY_MEDIA_TYPES)[number];

export const POST_HISTORY_TRIGGER_SOURCES = [
  'discord_observer',
  'discord_run_now',
  'instagram_observer',
  'instagram_run_now',
] as const;
export type PostHistoryTriggerSource =
  (typeof POST_HISTORY_TRIGGER_SOURCES)[number];

export const POST_HISTORY_STATUSES = ['pending', 'success', 'failed'] as const;
export type PostHistoryStatus = (typeof POST_HISTORY_STATUSES)[number];

@Entity('post_history')
export class PostHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  @Expose({ name: 'rule_id' })
  ruleId: string | null;

  @Column({ name: 'rule_name', length: 255, nullable: true })
  @Expose({ name: 'rule_name' })
  ruleName: string | null;

  @Column({ name: 'target_account_id', type: 'uuid', nullable: true })
  @Expose({ name: 'target_account_id' })
  targetAccountId: string | null;

  @ManyToOne(() => AccountEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_account_id' })
  targetAccount?: AccountEntity | null;

  @Column({ type: 'varchar' })
  @Expose({ name: 'platform' })
  platform: AutoPostTarget;

  @Column({ name: 'target_ref', nullable: true })
  @Expose({ name: 'target_ref' })
  targetRef: string | null;

  @Column({ name: 'media_type', type: 'varchar' })
  @Expose({ name: 'media_type' })
  mediaType: PostHistoryMediaType;

  @Column({ name: 'trigger_source', type: 'varchar' })
  @Expose({ name: 'trigger_source' })
  triggerSource: PostHistoryTriggerSource;

  @Column({ name: 'source_label', nullable: true })
  @Expose({ name: 'source_label' })
  sourceLabel: string | null;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  @Expose({ name: 'source_url' })
  sourceUrl: string | null;

  @Column({ type: 'text', nullable: true })
  @Expose({ name: 'caption' })
  caption: string | null;

  @Column({ name: 'post_url', type: 'text', nullable: true })
  @Expose({ name: 'post_url' })
  postUrl: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  @Expose({ name: 'status' })
  status: PostHistoryStatus;

  @Column({ type: 'int', default: 1 })
  @Expose({ name: 'attempts' })
  attempts: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  @Expose({ name: 'error_message' })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'posted_at', type: 'timestamptz' })
  @Expose({ name: 'posted_at' })
  postedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
