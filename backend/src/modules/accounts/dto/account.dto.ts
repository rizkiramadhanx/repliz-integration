import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ACCOUNT_TYPES, AccountType } from '../entities/account.entity';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @IsIn(ACCOUNT_TYPES)
  type: AccountType;

  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, unknown>;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;

  @IsObject()
  @IsOptional()
  credentials?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class DelegateAccountDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class PublishTelegramDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  mediaPath?: string;
}
