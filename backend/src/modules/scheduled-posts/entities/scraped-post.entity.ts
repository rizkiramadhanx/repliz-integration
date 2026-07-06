import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { ScrapeBatchJobEntity } from './scrape-batch-job.entity';

export const SCRAPED_POST_STATUSES = ['pending', 'used'] as const;
export type ScrapedPostStatus = (typeof SCRAPED_POST_STATUSES)[number];

@Entity('scraped_posts')
@Index(['batchJobId', 'shortcode'], { unique: true })
export class ScrapedPostEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'batch_job_id', type: 'uuid' })
  @Expose({ name: 'batch_job_id' })
  batchJobId: string;

  @ManyToOne(() => ScrapeBatchJobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_job_id' })
  batchJob?: ScrapeBatchJobEntity;

  @Column({ length: 255 })
  @Expose({ name: 'shortcode' })
  shortcode: string;

  @Column({ name: 'post_url', type: 'text' })
  @Expose({ name: 'post_url' })
  postUrl: string;

  @Column({ type: 'text', default: '' })
  @Expose({ name: 'caption' })
  caption: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  @Expose({ name: 'thumbnail_url' })
  thumbnailUrl: string | null;

  @Column({ name: 'is_video', default: false })
  @Expose({ name: 'is_video' })
  isVideo: boolean;

  @Column({ type: 'varchar', default: 'pending' })
  @Expose({ name: 'status' })
  status: ScrapedPostStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;
}
