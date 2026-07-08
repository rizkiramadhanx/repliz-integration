import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class StartBlastDto {
  @IsUUID()
  facebookAccountId: string;

  @IsString()
  @IsOptional()
  mediaPath?: string;

  @IsString()
  caption: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  groupIds: string[];

  @IsInt()
  @Min(1)
  gapMinutes: number;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
