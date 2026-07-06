import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  AUTO_POST_MEDIA_TYPES,
  AUTO_POST_TARGETS,
  AUTO_POST_TEMPLATE_MEDIA_TYPES,
  AUTO_POST_TRIGGER_TYPES,
  AutoPostMediaType,
  AutoPostTarget,
  AutoPostTemplateMediaType,
  AutoPostTriggerType,
  FACEBOOK_POST_MODES,
  FacebookPostMode,
} from '../entities/auto-post-rule.entity';

export const MIN_INSTAGRAM_OBSERVER_INTERVAL_MINUTES = 60;

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

  @IsIn(AUTO_POST_TRIGGER_TYPES)
  triggerType: AutoPostTriggerType;

  @IsUUID()
  @IsOptional()
  discordAccountId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  discordChannelIds?: string[];

  @IsUUID()
  @IsOptional()
  instagramObserverAccountId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  instagramTargetUsernames?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeKeywords?: string[];

  @IsBoolean()
  @IsOptional()
  includeOriginalCaption?: boolean;

  @IsInt()
  @Min(MIN_INSTAGRAM_OBSERVER_INTERVAL_MINUTES)
  @IsOptional()
  instagramCheckIntervalMinutes?: number;

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

  @IsString()
  @IsOptional()
  templateMediaPath?: string;

  @IsIn(AUTO_POST_TEMPLATE_MEDIA_TYPES)
  @IsOptional()
  templateMediaType?: AutoPostTemplateMediaType;

  @IsString()
  @IsOptional()
  templateCaption?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  cronExpression?: string;

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

  @IsIn(AUTO_POST_TRIGGER_TYPES)
  @IsOptional()
  triggerType?: AutoPostTriggerType;

  @IsUUID()
  @IsOptional()
  discordAccountId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  discordChannelIds?: string[];

  @IsUUID()
  @IsOptional()
  instagramObserverAccountId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  instagramTargetUsernames?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeKeywords?: string[];

  @IsBoolean()
  @IsOptional()
  includeOriginalCaption?: boolean;

  @IsInt()
  @Min(MIN_INSTAGRAM_OBSERVER_INTERVAL_MINUTES)
  @IsOptional()
  instagramCheckIntervalMinutes?: number;

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

  @IsString()
  @IsOptional()
  templateMediaPath?: string;

  @IsIn(AUTO_POST_TEMPLATE_MEDIA_TYPES)
  @IsOptional()
  templateMediaType?: AutoPostTemplateMediaType;

  @IsString()
  @IsOptional()
  templateCaption?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  cronExpression?: string;

  @IsBoolean()
  @IsOptional()
  saveMode?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
