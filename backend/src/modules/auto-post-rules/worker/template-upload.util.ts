import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

export const TEMPLATE_MEDIA_DIR = join(
  process.cwd(),
  'uploads',
  'template-media',
);

export const TEMPLATE_MEDIA_ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

export const TEMPLATE_MEDIA_MAX_SIZE_BYTES = 50 * 1024 * 1024;

export const templateMediaStorage = diskStorage({
  destination: TEMPLATE_MEDIA_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

export function templateMediaFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  cb(null, TEMPLATE_MEDIA_ALLOWED_MIMETYPES.includes(file.mimetype));
}
