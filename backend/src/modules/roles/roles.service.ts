import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { RoleEntity } from './entities/role.entity';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto/role.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResponseMeta } from '../../common/type/response';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async create(dto: CreateRoleDto) {
    const role = this.roleRepo.create(dto);
    const savedRole = await this.roleRepo.save(role);
    const instance = plainToInstance(RoleResponseDto, savedRole, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, {
      exposeDefaultValues: true,
    }) as Record<string, unknown>;
  }

  async list(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, keyword } = paginationDto;
    const skip = (page - 1) * limit;

    const whereCondition: FindOptionsWhere<RoleEntity> = {
      ...(keyword?.trim() ? { name: ILike(`%${keyword.trim()}%`) } : {}),
    };

    const [roles, total] = await this.roleRepo.findAndCount({
      skip,
      take: limit,
      where: whereCondition,
      order: { id: 'ASC' },
    });

    const rolesSerialized = plainToInstance(RoleEntity, roles, {
      exposeDefaultValues: true,
    });
    const data = Array.isArray(rolesSerialized) ? rolesSerialized : [];
    const totalPage = Math.ceil(total / limit);

    const meta: ResponseMeta = {
      page,
      limit,
      total,
      total_page: totalPage,
    };

    return {
      data,
      meta,
    };
  }

  async detailRole(roleId: string) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundException('Role not found');
    const instance = plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, { exposeDefaultValues: true }) as Record<
      string,
      unknown
    >;
  }

  async updateRole(roleId: string, dto: UpdateRoleDto) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });

    if (!role) throw new NotFoundException('Role not found');

    if (role.name === 'Admin')
      throw new ForbiddenException('Admin tidak boleh diganti');

    Object.assign(role, dto);
    const updatedRole = await this.roleRepo.save(role);
    const instance = plainToInstance(RoleResponseDto, updatedRole, {
      excludeExtraneousValues: true,
    });
    return instanceToPlain(instance, {
      exposeDefaultValues: true,
    }) as Record<string, unknown>;
  }

  async deleteRole(roleId: string) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });

    if (!role) throw new NotFoundException('Role not found');
    if (role.name === 'Admin')
      throw new ForbiddenException('Admin tidak boleh dihapus');

    await this.roleRepo.delete(roleId);
    return true;
  }
}
