import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BlastJobEntity } from './blast-job.entity';

export const BLAST_GROUP_RESULT_STATUSES = ['success', 'failed'] as const;
export type BlastGroupResultStatus =
  (typeof BLAST_GROUP_RESULT_STATUSES)[number];

@Entity('blast_group_results')
export class BlastGroupResultEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'blast_job_id', type: 'uuid' })
  @Expose({ name: 'blast_job_id' })
  blastJobId: string;

  @ManyToOne(() => BlastJobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blast_job_id' })
  blastJob?: BlastJobEntity;

  @Column({ name: 'group_id', length: 255 })
  @Expose({ name: 'group_id' })
  groupId: string;

  @Column({ type: 'varchar' })
  @Expose({ name: 'status' })
  status: BlastGroupResultStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  @Expose({ name: 'error_message' })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;
}
