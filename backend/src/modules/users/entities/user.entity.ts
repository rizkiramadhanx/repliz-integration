import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { RoleEntity } from '../../roles/entities/role.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ unique: true })
  @Expose({ name: 'email' })
  email: string;

  @Column({ nullable: true })
  @Expose({ name: 'name' })
  name: string | null;

  @Exclude()
  @Column()
  password: string;

  @Column({ name: 'is_confirmed', default: false })
  @Expose({ name: 'is_confirmed' })
  isConfirmed: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  @Expose({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => RoleEntity, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  @Expose({ name: 'role' })
  @Type(() => RoleEntity)
  role?: RoleEntity;

  @Expose({ name: 'role_id' })
  @Transform(({ obj }) => obj.role?.id ?? obj.roleId ?? null)
  roleId?: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  @Expose({ name: 'event_id' })
  eventId?: string | null;
}
