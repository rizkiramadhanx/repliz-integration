import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReplizSyncRuleEntity } from './repliz-sync-rule.entity';

export type ReplizSyncedPostStatus = 'scheduled' | 'failed';

// Satu baris = satu konten yang sudah diproses untuk satu target di satu
// rule. Unique (rule_id, target_username, shortcode) adalah kunci
// anti-duplikat: konten yang sudah pernah dikirim tidak akan dikirim lagi
// di run berikutnya, dan constraint di level DB mencegah duplikat walau ada
// dua run bersamaan. target_username ikut jadi kunci karena satu rule kini
// menangani banyak target — tanpa itu, konten dari target A akan menghalangi
// konten ber-shortcode sama dari target B.
@Entity('repliz_synced_posts')
@Index(
  'UQ_repliz_synced_rule_target_shortcode',
  ['ruleId', 'targetUsername', 'shortcode'],
  { unique: true },
)
export class ReplizSyncedPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_id', type: 'uuid' })
  ruleId: string;

  @ManyToOne(() => ReplizSyncRuleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: ReplizSyncRuleEntity;

  // Target asal konten ini — dipakai membedakan sumber saat satu rule
  // menangani banyak target.
  @Column({ name: 'target_username', default: '' })
  targetUsername: string;

  @Column({ name: 'shortcode' })
  shortcode: string;

  @Column({ name: 'post_url', type: 'text', nullable: true })
  postUrl: string | null;

  @Column({ name: 'caption', type: 'text', nullable: true })
  caption: string | null;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ name: 'is_video', type: 'boolean', default: false })
  isVideo: boolean;

  @Column({ name: 'repliz_schedule_id', type: 'varchar', nullable: true })
  replizScheduleId: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'status', default: 'scheduled' })
  status: ReplizSyncedPostStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
