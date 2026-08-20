import { Page, chromium } from 'playwright';
import { AccountEntity } from '../../accounts/entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../../accounts/connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Facebook menyajikan konten dari beberapa host CDN; dipakai untuk memisahkan
// media asli postingan dari ikon/emoji/sprite UI yang juga di-host di sana.
const FB_MEDIA_HOST = /\.fbcdn\.net|\.fbsbx\.com/i;

export type FacebookScrapeMode = 'posts' | 'reels';

export interface ScrapedFacebookPost {
  postId: string;
  caption: string;
  mediaUrl: string;
  isVideo: boolean;
  thumbnailUrl: string | null;
  postUrl: string;
}

function requireCookies(browsingAccount: AccountEntity): RawSessionCookie[] {
  const cookies = browsingAccount.credentials.cookies as
    | RawSessionCookie[]
    | undefined;
  if (!cookies || cookies.length === 0) {
    throw new Error(
      `Account ${browsingAccount.id} (${browsingAccount.label}) belum punya cookies Facebook`,
    );
  }
  return cookies;
}

// Anggaran waktu satu sesi. Facebook jauh lebih lambat dari Instagram:
// membuka tiap detail konten butuh ~5 detik, jadi 50 konten saja sudah
// melewati 4 menit sebelum menghitung waktu scroll. Batas dinaikkan ke 12
// menit — tetap ada plafon supaya Chromium tidak menggantung selamanya,
// tapi cukup untuk maxItems yang wajar.
const SESSION_HARD_TIMEOUT_MS = 12 * 60 * 1000;

// Sama seperti sesi Instagram: `run()` di-race dengan deadline eksplisit.
// Tanpa itu, loop scroll yang tidak pernah selesai membuat blok `finally`
// tidak tereksekusi sehingga proses Chromium menggantung selamanya.
async function withFacebookSession<T>(
  browsingAccount: AccountEntity,
  run: (page: Page) => Promise<T>,
): Promise<T> {
  const cookies = requireCookies(browsingAccount);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let deadlineTimer: NodeJS.Timeout;
  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(
      () =>
        reject(
          new Error('Sesi scraping Facebook timeout (melebihi 3 menit)'),
        ),
      SESSION_HARD_TIMEOUT_MS,
    );
  });

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    await context.addCookies(toPlaywrightCookies(cookies));

    const page = await context.newPage();
    try {
      return await Promise.race([run(page), deadline]);
    } finally {
      clearTimeout(deadlineTimer!);
      await page.close().catch(() => undefined);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

// Facebook membalas cookie kedaluwarsa dengan redirect ke /login (bukan
// error HTTP), sehingga tanpa pengecekan ini scraping akan "berhasil"
// mengembalikan 0 konten dan terlihat seperti profil kosong.
async function assertLoggedIn(page: Page): Promise<void> {
  const path = new URL(page.url()).pathname;
  if (/login|checkpoint|recover/i.test(path)) {
    throw new Error(
      'Cookie Facebook kadaluarsa — diarahkan ke halaman login. Perbarui cookies akun pemantau.',
    );
  }
}

// URL postingan Facebook punya banyak bentuk. Semua dinormalkan ke satu id
// stabil supaya anti-duplikat konsisten lintas bentuk URL.
export function extractFacebookPostId(href: string): string | null {
  const patterns = [
    /\/posts\/(?:pfbid)?([A-Za-z0-9]+)/,
    /\/videos\/(\d+)/,
    /\/reel\/(\d+)/,
    /story_fbid=(?:pfbid)?([A-Za-z0-9]+)/,
    /fbid=(\d+)/,
    /\/permalink\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = href.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function normalizeProfilePath(target: string): string {
  const trimmed = target.trim().replace(/^@+/, '');

  // Menerima URL penuh maupun username saja.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return url.pathname.replace(/^\/+|\/+$/g, '') + url.search;
    } catch {
      return trimmed;
    }
  }

  // Id numerik hanya bisa diakses lewat profile.php.
  if (/^\d+$/.test(trimmed)) return `profile.php?id=${trimmed}`;

  return trimmed;
}

function buildProfileUrl(
  profilePath: string,
  scrapeMode: FacebookScrapeMode,
): string {
  const base = `https://web.facebook.com/${profilePath}`;
  if (scrapeMode !== 'reels') return base;

  const url = new URL(base);
  url.searchParams.set('sk', 'reels_tab');
  return url.toString();
}

async function readPostLinksFromDom(page: Page): Promise<
  { postId: string; href: string; isVideo: boolean }[]
> {
  const links = await page.$$eval(
    'a[href*="/posts/"], a[href*="/videos/"], a[href*="/reel/"], a[href*="story_fbid="], a[href*="/permalink/"]',
    (els) =>
      els
        .map((el) => el.getAttribute('href') ?? '')
        .filter((href) => href.length > 0),
  );

  const seen = new Set<string>();
  const result: { postId: string; href: string; isVideo: boolean }[] = [];

  for (const href of links) {
    const patterns = [
      /\/posts\/(?:pfbid)?([A-Za-z0-9]+)/,
      /\/videos\/(\d+)/,
      /\/reel\/(\d+)/,
      /story_fbid=(?:pfbid)?([A-Za-z0-9]+)/,
      /fbid=(\d+)/,
      /\/permalink\/(\d+)/,
    ];
    let postId: string | null = null;
    for (const pattern of patterns) {
      const match = href.match(pattern);
      if (match?.[1]) {
        postId = match[1];
        break;
      }
    }
    if (!postId || seen.has(postId)) continue;

    seen.add(postId);
    result.push({
      postId,
      href: href.startsWith('http')
        ? href
        : `https://web.facebook.com${href}`,
      isVideo: /\/videos\/|\/reel\//.test(href),
    });
  }

  return result;
}

async function listRecentPostLinks(
  page: Page,
  target: string,
  limit: number,
  excludePostIds: Set<string>,
  scrapeMode: FacebookScrapeMode = 'posts',
): Promise<{ postId: string; href: string; isVideo: boolean }[]> {
  const profilePath = normalizeProfilePath(target);

  // Tab Reels dibuka lewat query `sk=reels_tab`. Profil numerik memakai
  // profile.php?id=... yang sudah punya query string, jadi pemisahnya harus
  // '&' — memakai '?' di sana membuat URL tidak valid dan Facebook
  // mengembalikan halaman kosong. `sk` yang sudah ada (mis. saat pengguna
  // menempel URL tab Reels utuh) tidak digandakan.
  const url = buildProfileUrl(profilePath, scrapeMode);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await page.waitForTimeout(3000);
  await assertLoggedIn(page);

  // Jeda scroll dipangkas dari 3s ke 1.5s dan percobaan dibatasi mengikuti
  // jumlah yang diminta: sebelumnya 40 scroll x 3s bisa menghabiskan 2 menit
  // hanya untuk menggulir, padahal konten yang dibutuhkan sering sudah
  // terkumpul jauh lebih awal.
  const MAX_SCROLL_ATTEMPTS = Math.min(40, Math.max(8, limit));
  const MAX_CONSECUTIVE_NO_PROGRESS = 3;
  const SCROLL_WAIT_MS = 1500;

  let attempts = 0;
  let consecutiveNoProgress = 0;
  let all = await readPostLinksFromDom(page);
  let fresh = all.filter((item) => !excludePostIds.has(item.postId));

  // Berhenti saat jumlah konten BARU sudah cukup — bukan saat total konten
  // cukup. Kalau memakai total, profil yang sebagian besar isinya sudah
  // pernah disinkron akan berhenti terlalu dini dan konten baru di bawahnya
  // tidak pernah terambil.
  while (fresh.length < limit && attempts < MAX_SCROLL_ATTEMPTS) {
    const previousCount = all.length;
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(SCROLL_WAIT_MS);
    attempts += 1;

    all = await readPostLinksFromDom(page);
    fresh = all.filter((item) => !excludePostIds.has(item.postId));

    if (all.length === previousCount) {
      consecutiveNoProgress += 1;
      if (consecutiveNoProgress >= MAX_CONSECUTIVE_NO_PROGRESS) break;
    } else {
      consecutiveNoProgress = 0;
    }
  }

  return fresh.slice(0, limit);
}

async function scrapePostDetail(
  page: Page,
  link: { postId: string; href: string; isVideo: boolean },
): Promise<ScrapedFacebookPost | null> {
  // Video reel diputar lewat MediaSource (blob), sehingga <video>.src selalu
  // null dan og:video tidak tersedia — URL aslinya HANYA muncul di lalu
  // lintas jaringan. Karena itu request video disadap, bukan dibaca dari DOM.
  // Listener dipasang sebelum navigasi agar tidak melewatkan request awal.
  const sniffedVideoUrls: string[] = [];
  const captureVideoUrl = (url: string) => {
    if (!/fbcdn|fbsbx/i.test(url)) return;
    if (!/\/o1\/v\/t2\/|\.mp4/i.test(url)) return;
    // Parameter byte-range menandakan potongan; dibuang supaya URL menunjuk
    // ke berkas utuh yang bisa diunduh sekali jalan.
    const clean = url.split('&bytestart')[0].split('&byteend')[0];
    if (!sniffedVideoUrls.includes(clean)) sniffedVideoUrls.push(clean);
  };
  const onRequest = (r: { url: () => string }) => captureVideoUrl(r.url());
  page.on('request', onRequest);

  try {
    await page.goto(link.href, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(link.isVideo ? 6000 : 2000);
    await assertLoggedIn(page);
  } finally {
    // Listener dilepas agar tidak menumpuk lintas pemanggilan pada satu page.
    page.off('request', onRequest);
  }

  const detail = await page.evaluate(
    ({ mediaHostSource }) => {
      const mediaHost = new RegExp(mediaHostSource, 'i');

      const metaContent = (property: string): string | null =>
        document
          .querySelector(`meta[property="${property}"]`)
          ?.getAttribute('content') ?? null;

      const ogVideo =
        metaContent('og:video:secure_url') ?? metaContent('og:video');
      const ogImage = metaContent('og:image');
      const ogDescription = metaContent('og:description');

      // Video di halaman feed sering tidak punya og:video; ambil dari
      // elemen <video> yang sudah ter-render sebagai cadangan.
      const videoEl = document.querySelector('video');
      const videoSrc =
        videoEl?.getAttribute('src') ??
        videoEl?.querySelector('source')?.getAttribute('src') ??
        null;

      // Gambar terbesar yang berasal dari CDN Facebook — menyaring
      // ikon/avatar kecil yang juga di-host di domain yang sama.
      let bestImage: string | null = null;
      let bestArea = 0;
      for (const img of Array.from(document.querySelectorAll('img'))) {
        const src = img.getAttribute('src') ?? '';
        if (!src || !mediaHost.test(src)) continue;
        const area = (img.naturalWidth || 0) * (img.naturalHeight || 0);
        if (area > bestArea) {
          bestArea = area;
          bestImage = src;
        }
      }

      // Caption diambil dari elemen pesan postingan bila ada; og:description
      // dipakai sebagai cadangan karena sering terpotong. Halaman reel tidak
      // memakai penanda data-ad-* seperti postingan biasa, jadi judul
      // dokumen dipakai sebagai cadangan terakhir.
      const messageEl = document.querySelector(
        '[data-ad-comet-preview="message"], [data-ad-preview="message"], [data-ad-rendering-role="story_message"]',
      );
      const ogTitle = metaContent('og:title');
      const caption =
        (messageEl?.textContent ?? '').trim() ||
        (ogDescription ?? '').trim() ||
        (ogTitle ?? '').trim();

      return {
        ogVideo,
        ogImage,
        videoSrc,
        bestImage,
        bestArea,
        caption,
      };
    },
    { mediaHostSource: FB_MEDIA_HOST.source },
  );

  const videoUrl =
    detail.ogVideo ?? detail.videoSrc ?? sniffedVideoUrls[0] ?? null;

  // Reel yang videonya tidak berhasil diambil sengaja dilewati, bukan
  // dikirim sebagai gambar: URL yang tersedia hanya thumbnail (t15.*), dan
  // menjadwalkannya ke Repliz akan menghasilkan postingan gambar diam yang
  // bukan konten aslinya.
  if (link.isVideo && !videoUrl) return null;

  const isVideo = Boolean(videoUrl);

  // Gambar sangat kecil hampir pasti ikon UI, bukan media postingan.
  const MIN_IMAGE_AREA = 40_000;
  const imageUrl =
    detail.ogImage ??
    (detail.bestArea >= MIN_IMAGE_AREA ? detail.bestImage : null);

  const mediaUrl = isVideo ? (videoUrl ?? imageUrl) : imageUrl;
  if (!mediaUrl) return null;

  return {
    postId: link.postId,
    caption: detail.caption ?? '',
    mediaUrl,
    isVideo: Boolean(videoUrl),
    thumbnailUrl: isVideo ? imageUrl : null,
    postUrl: link.href,
  };
}

export async function scrapeLatestFacebookPosts(
  browsingAccount: AccountEntity,
  target: string,
  limit = 5,
  excludePostIds: Set<string> = new Set(),
  scrapeMode: FacebookScrapeMode = 'posts',
): Promise<ScrapedFacebookPost[]> {
  return withFacebookSession(browsingAccount, async (page) => {
    const links = await listRecentPostLinks(
      page,
      target,
      limit,
      excludePostIds,
      scrapeMode,
    );
    if (links.length === 0) return [];

    const posts: ScrapedFacebookPost[] = [];
    for (const link of links) {
      try {
        const post = await scrapePostDetail(page, link);
        // Postingan tanpa media (status teks saja) dilewati: Repliz butuh
        // medias[] untuk tipe image/video, dan tipe `text` hanya didukung
        // sebagian platform.
        if (post) posts.push(post);
      } catch {
        // Satu postingan gagal (mis. sudah dihapus / dibatasi) tidak boleh
        // menggagalkan seluruh batch.
        continue;
      }
    }
    return posts;
  });
}
