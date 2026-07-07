import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class StartScrapeBatchDto {
  @IsUUID()
  sourceAccountId: string;

  @IsString()
  targetUsername: string;

  @IsInt()
  @Min(1)
  totalLimit: number;

  @IsIn(['posts', 'reels'])
  @IsOptional()
  scrapeMode?: 'posts' | 'reels';
}

export class GenerateDraftsFromScrapeDto {
  @IsArray()
  @IsUUID('4', { each: true })
  scrapedPostIds: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  targetAccountIds: string[];

  @IsInt()
  @Min(15)
  gapMinutes: number;
}
