import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { CategoryEntity } from './entities/category.entity';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create(dto);
    const saved = await this.categoryRepo.save(category);
    const instance = plainToInstance(CategoryResponseDto, saved, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async list(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, keyword } = paginationDto;
    const skip = (page - 1) * limit;

    const [categories, total] = await this.categoryRepo.findAndCount({
      skip,
      take: limit,
      where: keyword?.trim() ? { name: ILike(`%${keyword.trim()}%`) } : {},
      order: { createdAt: 'DESC' },
    });

    const totalPage = Math.ceil(total / limit);
    const meta: ResponseMeta = { page, limit, total, total_page: totalPage };

    return { data: categories, meta };
  }

  async detail(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    const instance = plainToInstance(CategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    Object.assign(category, dto);
    const saved = await this.categoryRepo.save(category);
    const instance = plainToInstance(CategoryResponseDto, saved, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async delete(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.categoryRepo.delete(id);
    return true;
  }
}
