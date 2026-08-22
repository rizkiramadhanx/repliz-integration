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
  // Endpoint Facebook memakai bentuk lain: { data: { title, hd, sd } }.
  data?:
    | {
        title?: string;
        quoted?: string;
        hd?: string;
        sd?: string;
        result?: AndarazItem[];
      }
    | AndarazItem[]
    | unknown;
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
  const text = decodeEntities((raw ?? '').trim());
  if (!text) return '';

  // Instagram dengan teks: `... on August 21, 2026: "isi caption"`.
  const quoted = text.match(/:\s*"([\s\S]*)"\s*\.?\s*$/);
  if (quoted) return quoted[1].trim();

  // Instagram tanpa teks: hanya ringkasan metrik, bukan caption.
  if (/^\d[\d.,]*\s+likes?,\s+[\d.,]+\s+comments?\s+-\s+/i.test(text)) {
    return '';
  }

  // Facebook: "68K views · 3.9K reactions | Isi postingan | Nama Halaman".
  // Ruas pertama selalu metrik dan ruas terakhir nama pemilik, jadi yang
  // diambil adalah bagian tengahnya.
  if (/^[\d.,]+[KMB]?\s+views?\s*·/i.test(text) && text.includes('|')) {
    const parts = text
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const middle = parts.slice(1, parts.length > 2 ? -1 : undefined);
      return middle.join(' | ').trim();
    }
    return '';
  }

  return text;
}

// Andaraz meneruskan teks Facebook apa adanya dari HTML, sehingga entitas
// seperti &#xb7; dan &amp; ikut terbawa dan akan terbit mentah.
function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
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

  if (data && typeof data === 'object') {
    const obj = data as {
      hd?: string;
      sd?: string;
      result?: AndarazItem[];
    };

    // Facebook: { data: { hd, sd } }. HD didahulukan, SD hanya dipakai bila
    // HD tidak tersedia — mengirim keduanya akan terbaca sebagai album berisi
    // video yang sama dua kali.
    if (typeof obj.hd === 'string' || typeof obj.sd === 'string') {
      const best = obj.hd || obj.sd;
      return best ? [{ url: best, type: 'video' }] : [];
    }

    // Bentuk v2: { data: { result: [{ quality, url }] } }, terurut HD lalu SD.
    if (Array.isArray(obj.result) && obj.result.length > 0) {
      return [obj.result[0]];
    }
  }

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

    const nested = (body.data ?? {}) as { title?: string; quoted?: string };

    return {
      mediaUrls: Array.from(new Set(mediaUrls)),
      // `quoted` (teks postingan) lebih tepat daripada `title` milik Facebook
      // yang berisi ringkasan metrik ("68K views · 3.9K reactions | ...").
      caption: cleanCaption(
        body.caption ?? nested.quoted ?? body.title ?? nested.title,
      ),
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
