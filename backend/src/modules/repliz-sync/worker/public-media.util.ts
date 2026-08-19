import { randomUUID } from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

export const REPLIZ_MEDIA_SUBDIR = 'repliz-media';

export const REPLIZ_MEDIA_DIR = path.join(
  process.cwd(),
  'uploads',
  REPLIZ_MEDIA_SUBDIR,
);

// Ekstensi ditentukan dari content-type respons, bukan dari URL — URL CDN
// Instagram sering tidak punya ekstensi yang bisa dipercaya (query string
// panjang, path tanpa .jpg), sedangkan Repliz menebak tipe media dari URL.
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

export type DownloadedMedia = {
  absolutePath: string;
  publicPath: string;
};

// URL publik wajib absolut dan bisa dijangkau dari internet: yang mengunduh
// file ini adalah server Repliz, bukan browser user. localhost otomatis
// gagal — karena itu PUBLIC_BASE_URL divalidasi eksplisit saat dipakai.
export function buildPublicUrl(publicPath: string): string {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'PUBLIC_BASE_URL belum dikonfigurasi — server Repliz butuh URL media yang bisa diakses dari internet',
    );
  }
  return `${baseUrl.replace(/\/+$/, '')}/${publicPath.replace(/^\/+/, '')}`;
}

export function assertPublicBaseUrlUsable(): void {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'PUBLIC_BASE_URL belum dikonfigurasi — isi dengan domain backend yang bisa diakses publik',
    );
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(baseUrl)) {
    throw new Error(
      `PUBLIC_BASE_URL (${baseUrl}) mengarah ke localhost — server Repliz tidak bisa mengunduh media dari sana. Pakai domain publik atau tunnel.`,
    );
  }
}

export async function downloadToPublicDir(
  url: string,
): Promise<DownloadedMedia> {
  fs.mkdirSync(REPLIZ_MEDIA_DIR, { recursive: true });

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Gagal mengunduh media (${response.status}): ${url}`);
  }

  const contentType = (
    response.headers.get('content-type') ?? ''
  ).split(';')[0];
  const extension = MIME_EXTENSION[contentType] ?? '.jpg';
  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(REPLIZ_MEDIA_DIR, filename);

  const fileStream = fs.createWriteStream(absolutePath);
  await pipeline(
    response.body as unknown as NodeJS.ReadableStream,
    fileStream,
  );

  return {
    absolutePath,
    publicPath: `uploads/${REPLIZ_MEDIA_SUBDIR}/${filename}`,
  };
}
