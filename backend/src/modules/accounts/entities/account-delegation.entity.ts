import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Exclude, Expose, Type } from 'class-transformer';
import { AccountEntity } from './account.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('account_delegations')
@Unique(['accountId', 'userId'])
export class AccountDelegationEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  @Exclude()
  accountId: string;

  @ManyToOne(() => AccountEntity, (account) => account.delegations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  @Exclude()
  account?: AccountEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  @Expose({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @Expose({ name: 'user' })
  @Type(() => UserEntity)
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;
}
