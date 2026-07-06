import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const DOWNLOAD_DIR = process.env.DOWNLOAD_PATH ?? '/tmp/auto-post-media';

export async function downloadToTemp(
  url: string,
  filename: string,
  headers?: Record<string, string>,
): Promise<string> {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const destPath = path.join(DOWNLOAD_DIR, `${Date.now()}_${filename}`);

  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download media: ${url} (${res.status})`);
  }

  const fileStream = fs.createWriteStream(destPath);
  await pipeline(res.body as unknown as NodeJS.ReadableStream, fileStream);
  return destPath;
}

export function deleteFile(filePath: string): void {
  fs.rm(filePath, { force: true }, () => {});
}
