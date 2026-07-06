import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoryResponseDto } from './category.dto';
import { BrandResponseDto } from './brand.dto';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsInt()
  @Min(0)
  weight: number;

  @IsUUID()
  @IsOptional()
  category_id?: string | null;

  @IsUUID()
  @IsOptional()
  brand_id?: string | null;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsUUID()
  @IsOptional()
  category_id?: string | null;

  @IsUUID()
  @IsOptional()
  brand_id?: string | null;
}

export class ItemResponseDto {
  @Expose({ name: 'id' })
  id: string;

  @Expose({ name: 'name' })
  name: string;

  @Expose({ name: 'weight' })
  weight: number;

  @Expose({ name: 'category_id' })
  categoryId: string | null;

  @Expose({ name: 'category' })
  @Type(() => CategoryResponseDto)
  category: CategoryResponseDto | null;

  @Expose({ name: 'brand_id' })
  brandId: string | null;

  @Expose({ name: 'brand' })
  @Type(() => BrandResponseDto)
  brand: BrandResponseDto | null;

  @Expose({ name: 'created_at' })
  createdAt: Date;

  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
