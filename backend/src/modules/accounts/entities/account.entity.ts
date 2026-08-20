import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { AccountDelegationEntity } from './account-delegation.entity';

export const ACCOUNT_TYPES = [
  'twitter',
  'telegram',
  'facebook',
  'instagram',
  'tiktok',
  'discord',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CONNECTION_STATUSES = [
  'unknown',
  'connected',
  'disconnected',
  'error',
] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

@Entity('accounts')
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ length: 255 })
  @Expose({ name: 'label' })
  label: string;

  @Column({ type: 'varchar' })
  @Expose({ name: 'type' })
  type: AccountType;

  @Exclude()
  @Column({ type: 'jsonb' })
  credentials: Record<string, unknown>;

  @Column({ name: 'is_active', default: true })
  @Expose({ name: 'is_active' })
  isActive: boolean;

  @Column({
    name: 'connection_status',
    type: 'varchar',
    default: 'unknown',
  })
  @Expose({ name: 'connection_status' })
  connectionStatus: ConnectionStatus;

  @Column({ name: 'connection_error', nullable: true })
  @Expose({ name: 'connection_error' })
  connectionError: string | null;

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  @Expose({ name: 'last_checked_at' })
  lastCheckedAt: Date | null;

  @OneToMany(() => AccountDelegationEntity, (d) => d.account)
  @Exclude()
  delegations: AccountDelegationEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
