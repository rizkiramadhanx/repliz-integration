import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsModule } from '../logs/logs.module';
import { ItemEntity } from './entities/item.entity';
import { CategoryEntity } from './entities/category.entity';
import { BrandEntity } from './entities/brand.entity';
import { ItemsService } from './items.service';
import { CategoriesService } from './categories.service';
import { BrandsService } from './brands.service';
import { ItemsController } from './items.controller';
import { CategoriesController } from './categories.controller';
import { BrandsController } from './brands.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemEntity, CategoryEntity, BrandEntity]),
    LogsModule,
  ],
  controllers: [ItemsController, CategoriesController, BrandsController],
  providers: [ItemsService, CategoriesService, BrandsService],
  exports: [ItemsService, CategoriesService, BrandsService],
})
export class ItemsModule {}
