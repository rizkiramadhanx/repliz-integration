import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

export const SCHEDULED_POST_MEDIA_DIR = join(
  process.cwd(),
  'uploads',
  'scheduled-post-media',
);

export const SCHEDULED_POST_MEDIA_ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

export const SCHEDULED_POST_MEDIA_MAX_SIZE_BYTES = 50 * 1024 * 1024;

export const scheduledPostMediaStorage = diskStorage({
  destination: SCHEDULED_POST_MEDIA_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

export function scheduledPostMediaFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  cb(null, SCHEDULED_POST_MEDIA_ALLOWED_MIMETYPES.includes(file.mimetype));
}
