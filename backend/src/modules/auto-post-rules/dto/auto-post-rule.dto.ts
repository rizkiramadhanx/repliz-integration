import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  AUTO_POST_MEDIA_TYPES,
  AUTO_POST_TARGETS,
  AutoPostMediaType,
  AutoPostTarget,
  FACEBOOK_POST_MODES,
  FacebookPostMode,
} from '../entities/auto-post-rule.entity';

export class CaptionReplacementDto {
  @IsString()
  @IsNotEmpty()
  find: string;

  @IsString()
  replace: string;
}

export class CreateAutoPostRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsUUID()
  discordAccountId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  discordChannelIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(AUTO_POST_TARGETS, { each: true })
  targets: AutoPostTarget[];

  @IsUUID()
  @IsOptional()
  facebookAccountId?: string;

  @IsIn(FACEBOOK_POST_MODES)
  @IsOptional()
  facebookPostMode?: FacebookPostMode;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facebookGroupIds?: string[];

  @IsUUID()
  @IsOptional()
  instagramAccountId?: string;

  @IsUUID()
  @IsOptional()
  twitterAccountId?: string;

  @IsUUID()
  @IsOptional()
  telegramAccountId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  telegramChatIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(AUTO_POST_MEDIA_TYPES, { each: true })
  mediaTypes: AutoPostMediaType[];

  @IsString()
  @IsOptional()
  captionPrefix?: string;

  @IsString()
  @IsOptional()
  captionSuffix?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptionReplacementDto)
  @IsOptional()
  captionReplacements?: CaptionReplacementDto[];

  @IsBoolean()
  @IsOptional()
  saveMode?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAutoPostRuleDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsUUID()
  @IsOptional()
  discordAccountId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  discordChannelIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(AUTO_POST_TARGETS, { each: true })
  @IsOptional()
  targets?: AutoPostTarget[];

  @IsUUID()
  @IsOptional()
  facebookAccountId?: string;

  @IsIn(FACEBOOK_POST_MODES)
  @IsOptional()
  facebookPostMode?: FacebookPostMode;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facebookGroupIds?: string[];

  @IsUUID()
  @IsOptional()
  instagramAccountId?: string;

  @IsUUID()
  @IsOptional()
  twitterAccountId?: string;

  @IsUUID()
  @IsOptional()
  telegramAccountId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  telegramChatIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(AUTO_POST_MEDIA_TYPES, { each: true })
  @IsOptional()
  mediaTypes?: AutoPostMediaType[];

  @IsString()
  @IsOptional()
  captionPrefix?: string;

  @IsString()
  @IsOptional()
  captionSuffix?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptionReplacementDto)
  @IsOptional()
  captionReplacements?: CaptionReplacementDto[];

  @IsBoolean()
  @IsOptional()
  saveMode?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
