import { PartialType } from '@nestjs/mapped-types';
import {
  CreateUserDto,
  CreateUserManualUserDto,
  UserResponseDto,
} from './base-user.dto';

export class RegisterUserDto extends CreateUserDto {
  createdAt: Date;
}

export class RegisterManualUserDto extends CreateUserManualUserDto {
  createdAt: Date;
}

export class UpdateUserDto extends PartialType(UserResponseDto) {
  password?: string;
}
