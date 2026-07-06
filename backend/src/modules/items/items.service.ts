import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { ItemEntity } from './entities/item.entity';
import { CreateItemDto, ItemResponseDto, UpdateItemDto } from './dto/item.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
  ) {}

  async create(dto: CreateItemDto) {
    const item = this.itemRepo.create({
      name: dto.name,
      weight: dto.weight,
      categoryId: dto.category_id ?? null,
      brandId: dto.brand_id ?? null,
    });
    const saved = await this.itemRepo.save(item);
    const found = await this.itemRepo.findOne({
      where: { id: saved.id },
      relations: ['category', 'brand'],
    });
    const instance = plainToInstance(ItemResponseDto, found, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async list(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, keyword } = paginationDto;
    const skip = (page - 1) * limit;

    const [items, total] = await this.itemRepo.findAndCount({
      skip,
      take: limit,
      where: keyword?.trim() ? { name: ILike(`%${keyword.trim()}%`) } : {},
      relations: ['category', 'brand'],
      order: { createdAt: 'DESC' },
    });

    const totalPage = Math.ceil(total / limit);
    const meta: ResponseMeta = { page, limit, total, total_page: totalPage };

    return { data: items, meta };
  }

  async detail(id: string) {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });
    if (!item) throw new NotFoundException('Item not found');
    const instance = plainToInstance(ItemResponseDto, item, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async update(id: string, dto: UpdateItemDto) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    Object.assign(item, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.category_id !== undefined && { categoryId: dto.category_id }),
      ...(dto.brand_id !== undefined && { brandId: dto.brand_id }),
    });
    await this.itemRepo.save(item);
    const found = await this.itemRepo.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });
    const instance = plainToInstance(ItemResponseDto, found, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async delete(id: string) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    await this.itemRepo.delete(id);
    return true;
  }
}
