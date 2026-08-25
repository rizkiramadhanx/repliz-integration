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

// Menyimpan berkas yang dikirim langsung (bukan diunduh dari URL). Dipakai
// extension untuk media Threads/X: CDN-nya menolak permintaan dari server
// luar (terbukti HTTP 403), jadi browser penggunalah yang mengambil bytenya
// lalu mengunggahnya ke sini agar punya URL publik yang bisa dibaca Repliz.
export function saveBufferToPublicDir(
  buffer: Buffer,
  contentType: string,
): DownloadedMedia {
  fs.mkdirSync(REPLIZ_MEDIA_DIR, { recursive: true });

  const normalized = (contentType ?? '').split(';')[0].trim().toLowerCase();
  const extension = MIME_EXTENSION[normalized];
  if (!extension) {
    throw new Error(`Tipe media tidak didukung: ${normalized || '(kosong)'}`);
  }

  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(REPLIZ_MEDIA_DIR, filename);
  fs.writeFileSync(absolutePath, buffer);

  return {
    absolutePath,
    publicPath: `uploads/${REPLIZ_MEDIA_SUBDIR}/${filename}`,
  };
}

export type DownloadedMedia = {
  absolutePath: string;
  publicPath: string;
};

// URL publik wajib absolut dan bisa dijangkau dari internet: yang mengunduh
// file ini adalah server Repliz, bukan browser user. localhost otomatis
// gagal — karena itu PUBLIC_BASE_URL divalidasi eksplisit saat dipakai.
// Basis URL publik. PUBLIC_BASE_URL hanya perlu diisi kalau domainnya beda
// dari BACKEND_DOMAIN (mis. memakai tunnel saat pengembangan); selain itu
// nilainya diturunkan otomatis supaya tidak ada satu setelan yang harus
// dijaga konsisten di dua tempat.
export function resolvePublicBaseUrl(): string | null {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit;

  const backendDomain = process.env.BACKEND_DOMAIN?.trim();
  if (backendDomain) {
    return /^https?:\/\//i.test(backendDomain)
      ? backendDomain
      : `https://${backendDomain}`;
  }

  return null;
}

export function buildPublicUrl(publicPath: string): string {
  const baseUrl = resolvePublicBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'PUBLIC_BASE_URL/BACKEND_DOMAIN belum dikonfigurasi — server Repliz butuh URL media yang bisa diakses dari internet',
    );
  }
  return `${normalizePublicBaseUrl(baseUrl)}/${publicPath.replace(/^\/+/, '')}`;
}

// Membuang port dari URL https. Traefik menerima TLS di 443 lalu meneruskan
// ke port aplikasi di jaringan internal, sehingga port aplikasi tidak boleh
// muncul di URL publik. Dipakai juga saat menyusun URL agar salah konfigurasi
// pada instalasi lama tidak menghasilkan link yang rusak permanen.
export function normalizePublicBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' && parsed.port && parsed.port !== '443') {
      parsed.port = '';
      return parsed.toString().replace(/\/+$/, '');
    }
  } catch {
    // Bukan URL valid — biarkan apa adanya, assertPublicBaseUrlUsable yang
    // akan menolaknya dengan pesan jelas sebelum dipakai.
  }
  return trimmed;
}

export function assertPublicBaseUrlUsable(): void {
  const baseUrl = resolvePublicBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'BACKEND_DOMAIN belum dikonfigurasi — isi dengan domain backend yang bisa diakses publik (atau PUBLIC_BASE_URL bila domainnya berbeda)',
    );
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(baseUrl)) {
    throw new Error(
      `PUBLIC_BASE_URL (${baseUrl}) mengarah ke localhost — server Repliz tidak bisa mengunduh media dari sana. Pakai domain publik atau tunnel.`,
    );
  }

  // Domain contoh dari .env.example gampang tertinggal saat menyalin berkas
  // itu. Nilainya lolos semua pemeriksaan lain (skema benar, bukan localhost),
  // sehingga kegagalannya baru muncul jauh di belakang sebagai penolakan dari
  // Instagram/Repliz: "media could not be fetched from this URI".
  if (/(^|\.)example\.(com|org|net)$/i.test(new URL(baseUrl).hostname)) {
    throw new Error(
      `PUBLIC_BASE_URL (${baseUrl}) masih memakai domain contoh dari .env.example. Ganti BACKEND_DOMAIN di .env dengan domain aslimu.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(
      `PUBLIC_BASE_URL (${baseUrl}) bukan URL yang valid — contoh benar: https://api.domain.com`,
    );
  }

  // https + port aplikasi adalah kombinasi yang mustahil: TLS diterminasi
  // Traefik di 443, sedangkan port aplikasi (4000) bicara HTTP polos. URL
  // seperti https://domain.com:4000 menghasilkan ERR_SSL_PROTOCOL_ERROR di
  // browser dan gagal diunduh server Repliz — tanpa cek ini, kegagalannya
  // baru terlihat setelah jadwal terlanjur dibuat.
  if (parsed.protocol === 'https:' && parsed.port && parsed.port !== '443') {
    throw new Error(
      `PUBLIC_BASE_URL (${baseUrl}) memakai https dengan port ${parsed.port}. TLS diterminasi di port 443 oleh Traefik, sedangkan port ${parsed.port} melayani HTTP polos — akses https ke port itu gagal dengan SSL protocol error. Hapus portnya: ${parsed.protocol}//${parsed.hostname}`,
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

export type MediaFileInfo = {
  filename: string;
  absolutePath: string;
  bytes: number;
  modifiedAt: Date;
};

// Mendaftar seluruh berkas media yang tersimpan di disk. Dipakai pembersihan
// untuk mencari berkas yatim — yang tidak lagi dirujuk jadwal mana pun.
// Direktori yang belum ada bukan error: berarti belum pernah ada impor.
export function listMediaFiles(): MediaFileInfo[] {
  if (!fs.existsSync(REPLIZ_MEDIA_DIR)) return [];

  return fs
    .readdirSync(REPLIZ_MEDIA_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const absolutePath = path.join(REPLIZ_MEDIA_DIR, entry.name);
      const stat = fs.statSync(absolutePath);
      return {
        filename: entry.name,
        absolutePath,
        bytes: stat.size,
        modifiedAt: stat.mtime,
      };
    });
}

// Menghapus berkas dan melaporkan byte yang benar-benar terbebaskan. Berkas
// yang gagal dihapus dilewati, bukan menggagalkan seluruh pembersihan:
// satu berkas terkunci tidak boleh menyisakan ratusan lainnya.
export function deleteMediaFiles(filenames: string[]): {
  deleted: number;
  bytesFreed: number;
  failed: string[];
} {
  let deleted = 0;
  let bytesFreed = 0;
  const failed: string[] = [];

  for (const filename of filenames) {
    // Nama berkas dari luar tidak boleh keluar dari direktori media —
    // tanpa ini "../../.env" akan terhapus.
    const absolutePath = path.join(REPLIZ_MEDIA_DIR, path.basename(filename));
    if (path.dirname(absolutePath) !== REPLIZ_MEDIA_DIR) {
      failed.push(filename);
      continue;
    }

    try {
      const stat = fs.statSync(absolutePath);
      fs.unlinkSync(absolutePath);
      deleted += 1;
      bytesFreed += stat.size;
    } catch {
      failed.push(filename);
    }
  }

  return { deleted, bytesFreed, failed };
}

// Mengambil nama berkas dari URL publik ("https://api.x/uploads/repliz-media/uuid.mp4"
// → "uuid.mp4"). URL yang bukan milik direktori media menghasilkan null,
// sehingga media pihak ketiga tidak pernah ikut terhitung.
export function mediaFilenameFromUrl(url: string): string | null {
  if (!url || !url.includes(`/uploads/${REPLIZ_MEDIA_SUBDIR}/`)) return null;
  const withoutQuery = url.split('?')[0];
  const filename = withoutQuery.split('/').pop();
  return filename ? filename : null;
}
