import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('processed_instagram_posts')
export class ProcessedInstagramPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_id', type: 'uuid' })
  ruleId: string;

  @Column({ name: 'source_item_id' })
  sourceItemId: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;
}
