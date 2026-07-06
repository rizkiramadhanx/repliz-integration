import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { CategoryEntity } from './category.entity';
import { BrandEntity } from './brand.entity';

@Entity('items')
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ length: 255 })
  @Expose({ name: 'name' })
  name: string;

  @Column({ type: 'int' })
  @Expose({ name: 'weight' })
  weight: number;

  @Column({ name: 'category_id', nullable: true })
  @Expose({ name: 'category_id' })
  categoryId: string | null;

  @ManyToOne(() => CategoryEntity, (category) => category.items, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  @Expose({ name: 'category' })
  category: CategoryEntity | null;

  @Column({ name: 'brand_id', nullable: true })
  @Expose({ name: 'brand_id' })
  brandId: string | null;

  @ManyToOne(() => BrandEntity, (brand) => brand.items, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'brand_id' })
  @Expose({ name: 'brand' })
  brand: BrandEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
