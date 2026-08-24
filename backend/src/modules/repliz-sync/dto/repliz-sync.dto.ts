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

// Menerima array maupun string dipisah koma/spasi, lalu menormalkan tiap
// entri: buang '@', spasi, dan duplikat. Bentuk string didukung karena form
// bisa mengirim satu field teks berisi beberapa target.
//
// Normalisasi sengaja dilakukan di controller, bukan lewat @Transform:
// ValidationPipe global dipasang tanpa transform: true, sehingga dekorator
// class-transformer tidak dijalankan sama sekali. Mengaktifkannya secara
// global akan mengubah perilaku semua endpoint lain.
export function normalizeUsernames(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\s]+/)
      : [];

  const cleaned = raw
    .map((item) => String(item).trim().replace(/^@+/, ''))
    .filter((item) => item.length > 0);

  return Array.from(new Set(cleaned));
}

export class CreateReplizSyncRuleDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  // Username target (z) — bisa banyak. Disimpan tanpa '@' supaya konsisten
  // saat dipakai menyusun URL Instagram.
  // Divalidasi manual di controller lewat normalizeUsernames() karena
  // nilainya boleh string maupun array.
  targetUsernames: string[] | string;

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
    message: 'scrapeTime harus format HH:mm',
  })
  scrapeTime?: string;

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
  @IsIn(['instagram', 'facebook', 'tiktok'])
  sourcePlatform?: 'instagram' | 'facebook' | 'tiktok';

  @IsOptional()
  @IsIn(['posts', 'reels', 'stories'])
  scrapeMode?: 'posts' | 'reels' | 'stories';

  @IsOptional()
  @IsIn(['posts', 'reels', 'stories'])
  postType?: 'posts' | 'reels' | 'stories';

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
  declare targetUsernames: string[] | string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare replizAccountId: string;
}
