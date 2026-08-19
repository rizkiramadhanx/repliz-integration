import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateReplizSyncRuleDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  // Username target (z) — disimpan tanpa '@' supaya konsisten saat
  // dipakai menyusun URL Instagram.
  @IsString()
  @IsNotEmpty()
  targetUsername: string;

  @IsString()
  @IsNotEmpty()
  replizAccountId: string;

  @IsOptional()
  @IsString()
  replizAccountLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxItems?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'scheduleStartTime harus format HH:mm',
  })
  scheduleStartTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  scheduleIntervalMinutes?: number;

  @IsOptional()
  @IsIn(['posts', 'reels'])
  scrapeMode?: 'posts' | 'reels';

  @IsOptional()
  @IsIn(['active', 'paused'])
  status?: 'active' | 'paused';
}

export class UpdateReplizSyncRuleDto extends CreateReplizSyncRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare label: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare targetUsername: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare replizAccountId: string;
}
