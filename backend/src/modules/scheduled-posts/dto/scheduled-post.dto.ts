import {
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateScheduledPostDraftDto {
  @IsString()
  @IsOptional()
  caption?: string;
}

export class UpdateScheduledPostDraftDto {
  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  targetAccountIds?: string;
}

export class ScheduleDto {
  @IsISO8601()
  scheduledAt: string;
}

export class BulkIdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

export class FindAllScheduledPostsQueryDto extends PaginationDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

