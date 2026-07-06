import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { BrandEntity } from './entities/brand.entity';
import {
  BrandResponseDto,
  CreateBrandDto,
  UpdateBrandDto,
} from './dto/brand.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(BrandEntity)
    private readonly brandRepo: Repository<BrandEntity>,
  ) {}

  async create(dto: CreateBrandDto) {
    const brand = this.brandRepo.create(dto);
    const saved = await this.brandRepo.save(brand);
    const instance = plainToInstance(BrandResponseDto, saved, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async list(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, keyword } = paginationDto;
    const skip = (page - 1) * limit;

    const [brands, total] = await this.brandRepo.findAndCount({
      skip,
      take: limit,
      where: keyword?.trim() ? { name: ILike(`%${keyword.trim()}%`) } : {},
      order: { createdAt: 'DESC' },
    });

    const totalPage = Math.ceil(total / limit);
    const meta: ResponseMeta = { page, limit, total, total_page: totalPage };

    return { data: brands, meta };
  }

  async detail(id: string) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    const instance = plainToInstance(BrandResponseDto, brand, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    Object.assign(brand, dto);
    const saved = await this.brandRepo.save(brand);
    const instance = plainToInstance(BrandResponseDto, saved, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<string, unknown>;
  }

  async delete(id: string) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    await this.brandRepo.delete(id);
    return true;
  }
}
