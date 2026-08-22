import { Logger } from '@nestjs/common';

// Andaraz menyatukan downloader TikTok/Instagram/Facebook di satu layanan
// berbayar dengan kunci API, menggantikan rangkaian layanan gratis yang
// gampang memblokir IP. Dipakai sebagai jalur UTAMA; pemanggil tetap
// menyediakan cadangan karena layanan pihak ketiga mana pun bisa tumbang —
// dashboard Andaraz sendiri mencatat success rate ~88%.
const BASE_URL = 'https://api.andaraz.com';
const TIMEOUT_MS = 60000;

const logger = new Logger('AndarazUtil');

export type AndarazMedia = {
  mediaUrls: string[];
  caption: string;
  isVideo: boolean;
};

type AndarazItem = {
  type?: string;
  url?: string;
  thumbnail?: string;
};

type AndarazResponse = {
  status?: boolean;
  error?: string;
  message?: string;
  type?: string;
  caption?: string;
  title?: string;
  download_url?: string;
  results?: AndarazItem[];
  data?: unknown;
};

export function isAndarazEnabled(): boolean {
  return Boolean(readApiKey());
}

function readApiKey(): string {
  // Tanda kutip ikut terbawa bila .env ditulis API_ANDARAZ_TOKEN="abc",
  // dan kunci dengan kutip akan ditolak sebagai tidak sah.
  return (process.env.API_ANDARAZ_TOKEN ?? '').trim().replace(/^["']|["']$/g, '');
}

function endpointFor(platform: 'tiktok' | 'instagram' | 'facebook'): string {
  return `/api/${platform}/download`;
}

// Caption Instagram dari Andaraz kerap berupa ringkasan metrik
// ("89 likes, 0 comments - user on August 16, 2026") ketika postingan tidak
// punya teks. Kalimat itu bukan caption asli dan tidak layak ikut terbit,
// jadi dibuang. Bentuk dengan teks asli memakai pola `: "..."` di belakang
// metriknya — bagian dalam kutip itulah captionnya.
export function cleanCaption(raw?: string): string {
  const text = (raw ?? '').trim();
  if (!text) return '';

  const quoted = text.match(/:\s*"([\s\S]*)"\s*\.?\s*$/);
  if (quoted) return quoted[1].trim();

  if (/^\d[\d.,]*\s+likes?,\s+[\d.,]+\s+comments?\s+-\s+/i.test(text)) {
    return '';
  }

  return text;
}

function collectMedia(body: AndarazResponse): AndarazItem[] {
  if (Array.isArray(body.results) && body.results.length > 0) {
    return body.results;
  }
  // Sebagian endpoint hanya mengembalikan satu tautan di akar respons.
  if (body.download_url) {
    return [{ url: body.download_url, type: body.type }];
  }
  const data = body.data;
  if (Array.isArray(data)) return data as AndarazItem[];
  return [];
}

function looksLikeVideo(items: AndarazItem[], declaredType?: string): boolean {
  const type = (declaredType ?? '').toLowerCase();
  if (type === 'video' || type === 'reel') return true;
  if (type === 'image' || type === 'carousel') {
    // Carousel bisa berisi video; tipe tiap item lebih menentukan daripada
    // tipe postingannya.
    return items.some((item) => (item.type ?? '').toLowerCase() === 'video');
  }
  if (items.some((item) => (item.type ?? '').toLowerCase() === 'video')) {
    return true;
  }
  const first = items[0]?.url ?? '';
  return !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(first);
}

export async function fetchViaAndaraz(
  url: string,
  platform: 'tiktok' | 'instagram' | 'facebook',
): Promise<AndarazMedia | null> {
  const apiKey = readApiKey();
  if (!apiKey) return null;

  const endpoint = `${BASE_URL}${endpointFor(platform)}?apikey=${encodeURIComponent(
    apiKey,
  )}&url=${encodeURIComponent(url)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Andaraz membalas HTTP ${response.status}`);
    }

    const body = (await response.json()) as AndarazResponse;

    // Andaraz melaporkan kegagalan di dalam body dengan HTTP 200, memakai dua
    // bentuk berbeda: { error } dan { status:false, message }.
    if (body.error || body.status === false) {
      throw new Error(body.error || body.message || 'Andaraz gagal memproses URL');
    }

    const items = collectMedia(body);
    const mediaUrls = items
      .map((item) => item.url)
      .filter(
        (item): item is string =>
          typeof item === 'string' && /^https?:/i.test(item),
      );

    if (mediaUrls.length === 0) return null;

    return {
      mediaUrls: Array.from(new Set(mediaUrls)),
      caption: cleanCaption(body.caption ?? body.title),
      isVideo: looksLikeVideo(items, body.type),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Kegagalan dicatat tapi tidak dilempar: pemanggil akan mencoba jalur
    // cadangan, dan melempar di sini membuat impor berhenti tanpa perlu.
    logger.warn(`Andaraz gagal untuk ${platform} ${url}: ${message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
