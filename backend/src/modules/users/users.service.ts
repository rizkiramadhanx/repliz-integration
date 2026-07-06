import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from '../roles/entities/role.entity';
import { UpdateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from './dto/base-user.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { ResponseMeta } from '../../common/type/response';
import * as bcrypt from 'bcrypt';

/** Pastikan created_at & updated_at selalu dari entity (serialization kadang tidak memetakan) */
function withUserTimestamps(
  plain: Record<string, unknown>,
  entity: { createdAt?: Date; updatedAt?: Date },
): Record<string, unknown> {
  plain.created_at =
    entity?.createdAt != null
      ? typeof entity.createdAt === 'string'
        ? entity.createdAt
        : entity.createdAt.toISOString()
      : null;
  plain.updated_at =
    entity?.updatedAt != null
      ? typeof entity.updatedAt === 'string'
        ? entity.updatedAt
        : entity.updatedAt.toISOString()
      : null;
  return plain;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = this.userRepository.create({
      name: createUserDto.name ?? null,
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role_id
        ? ({ id: createUserDto.role_id } as RoleEntity)
        : undefined,
    });

    const savedUser = await this.userRepository.save(newUser);
    const instance = plainToInstance(UserEntity, savedUser);
    const plain = instanceToPlain(instance, {
      excludeExtraneousValues: true,
    }) as Record<string, unknown>;
    return withUserTimestamps(plain, savedUser);
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const instance = plainToInstance(UserEntity, user);
    const plain = instanceToPlain(instance, {
      excludeExtraneousValues: true,
    }) as Record<string, unknown>;
    return withUserTimestamps(plain, user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role_id) {
      user.role = { id: updateUserDto.role_id } as RoleEntity;
    }

    // Assign other fields
    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.password) user.password = updateUserDto.password;

    const updatedUser = await this.userRepository.save(user);
    const instance = plainToInstance(UserEntity, updatedUser);
    const plain = instanceToPlain(instance, {
      excludeExtraneousValues: true,
    }) as Record<string, unknown>;
    return withUserTimestamps(plain, updatedUser);
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async updateUserProfile(email: string, user: UpdateUserDto) {
    const userExists = await this.userRepository.findOne({ where: { email } });
    if (!userExists) throw new NotFoundException('User not found');

    if (user.name) userExists.name = user.name;
    if (user.email) userExists.email = user.email;
    if (user.password) {
      userExists.password = await bcrypt.hash(user.password, 10);
    }
    if (user.role_id) userExists.role = { id: user.role_id } as RoleEntity;

    const updated = await this.userRepository.save(userExists);
    const instance = plainToInstance(UserEntity, updated);
    const plain = instanceToPlain(instance, {
      excludeExtraneousValues: true,
    }) as Record<string, unknown>;
    return withUserTimestamps(plain, updated);
  }

  async getAllUser(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (paginationDto.keyword?.trim()) {
      whereCondition.name = ILike(`%${paginationDto.keyword.trim()}%`);
    }

    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      relations: ['role'],
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        role: {
          id: true,
          name: true,
          actions: true,
        },
      },
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });

    const usersSerialized = plainToInstance(UserEntity, users);
    const data = (
      Array.isArray(usersSerialized) ? usersSerialized : [usersSerialized]
    ).map((u, i) => {
      const plain = instanceToPlain(u, {
        excludeExtraneousValues: true,
      }) as Record<string, unknown>;
      return withUserTimestamps(plain, users[i]);
    });
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
}
