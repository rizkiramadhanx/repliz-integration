import { Page, chromium } from 'playwright';
import { fetchViaAndaraz } from './andaraz.util';
import { AccountEntity } from '../../accounts/entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../../accounts/connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// m.facebook.com hanya menyajikan pemutar progresif kepada peramban mobile;
// dengan UA desktop ia mengalihkan ke situs biasa yang memakai DASH.
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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

// Meminta URL unduhan ke ruhend-scraper. Layanan ini mengembalikan varian
// `xpv_progressive` 720p — satu MP4 berisi video DAN audio. Facebook tidak
// menyajikan varian itu ke peramban: lewat halaman web hanya tersedia DASH
// (video dan audio terpisah, dan untuk reel resolusi tertingginya sering
// hanya 360p), sehingga jalur ini yang memberi kualitas terbaik.
//
// Mengembalikan null bila gagal; pemanggil punya cadangan berlapis.
async function fetchDownloaderVideoUrl(
  postId: string,
): Promise<string | null> {
  // Andaraz dicoba lebih dulu: satu layanan berbayar berkunci API, alih-alih
  // layanan gratis yang gampang memblokir IP server. Bila gagal, jalur lama
  // di bawah tetap dipakai.
  const viaAndaraz = await fetchViaAndaraz(
    `https://www.facebook.com/reel/${postId}/`,
    'facebook',
  );
  if (viaAndaraz?.mediaUrls.length) return viaAndaraz.mediaUrls[0];

  try {
    // require dipakai agar kegagalan memuat modul pihak ketiga tidak
    // menggagalkan seluruh scraper saat paketnya belum terpasang.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fbdl } = require('ruhend-scraper') as {
      fbdl: (url: string) => Promise<string[]>;
    };

    const urls = await Promise.race([
      fbdl(`https://www.facebook.com/reel/${postId}/`),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 45000),
      ),
    ]);

    if (!Array.isArray(urls) || urls.length === 0) return null;

    // Pilih resolusi tertinggi bila layanan mengembalikan beberapa varian.
    const scored = urls
      .filter((url) => typeof url === 'string' && /^https?:/i.test(url))
      .map((url) => {
        let height = 0;
        try {
          const efg = new URL(url).searchParams.get('efg');
          if (efg) {
            const tag = String(
              JSON.parse(Buffer.from(efg, 'base64').toString('utf8'))
                .vencode_tag ?? '',
            );
            height = Number(tag.match(/[._](\d{3,4})p?[._]/)?.[1] ?? 0);
          }
        } catch {
          // Tanpa metadata, URL tetap dipakai dengan skor 0.
        }
        return { url, height };
      })
      .sort((a, b) => b.height - a.height);

    return scored[0]?.url ?? null;
  } catch {
    return null;
  }
}

// Mengambil URL MP4 progresif dari situs mobile Facebook. Dipakai sebagai
// cadangan bila downloader gagal: resolusinya hanya 360p tapi video dan
// audionya sudah tergabung.
async function fetchProgressiveVideoUrl(
  page: Page,
  postId: string,
): Promise<string | null> {
  // Dibuka di context terpisah ber-UA mobile: mengganti UA pada context yang
  // sedang dipakai tidak mungkin di Playwright, dan halaman desktop masih
  // diperlukan untuk membaca caption serta gambar.
  const context = await page.context().browser()?.newContext({
    userAgent: MOBILE_USER_AGENT,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  if (!context) return null;

  try {
    // Sesi login dibawa dari context desktop supaya reel non-publik tetap
    // bisa diakses.
    await context.addCookies(await page.context().cookies());
    const mobilePage = await context.newPage();

    await mobilePage.goto(`https://m.facebook.com/reel/${postId}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(4000);

    const src = await mobilePage.evaluate(() => {
      const video = document.querySelector('video');
      return video?.getAttribute('src') ?? null;
    });

    if (!src || !/fbcdn|fbsbx/i.test(src)) return null;
    return src;
  } catch {
    // Situs mobile bisa saja menolak atau berubah; pemanggil punya cadangan.
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function scrapePostDetail(
  page: Page,
  link: { postId: string; href: string; isVideo: boolean },
): Promise<ScrapedFacebookPost | null> {
  // Video reel diputar lewat MediaSource (blob), sehingga <video>.src selalu
  // null dan og:video tidak tersedia — URL aslinya HANYA muncul di lalu
  // lintas jaringan. Karena itu request video disadap, bukan dibaca dari DOM.
  // Listener dipasang sebelum navigasi agar tidak melewatkan request awal.
  // Halaman reel mem-preload reel BERIKUTNYA (rekomendasi), sehingga request
  // yang tersadap memuat beberapa video_id berbeda. Tanpa penyaringan,
  // konten yang tersimpan bisa berasal dari reel lain — bukan milik target.
  // Selain itu Facebook memakai DASH: tiap video punya beberapa varian
  // (360p, 720p, ...) plus trek audio TERPISAH. Varian audio harus dibuang,
  // dan varian video dipilih yang resolusinya paling tinggi.
  type SniffedVideo = {
    url: string;
    videoId: string | null;
    height: number;
    isAudio: boolean;
  };
  const sniffed: SniffedVideo[] = [];

  const captureVideoUrl = (url: string) => {
    if (!/fbcdn|fbsbx/i.test(url)) return;
    if (!/\/o1\/v\/t2\/|\.mp4/i.test(url)) return;

    // Parameter byte-range menandakan potongan; dibuang supaya URL menunjuk
    // ke berkas utuh yang bisa diunduh sekali jalan.
    const clean = url.split('&bytestart')[0].split('&byteend')[0];
    if (sniffed.some((item) => item.url === clean)) return;

    // `efg` memuat metadata varian dalam base64: vencode_tag (mis.
    // "dash_vp9-basic-gen2_720p" atau "..._audio") dan video_id.
    let videoId: string | null = null;
    let height = 0;
    let isAudio = false;
    try {
      const efg = new URL(clean).searchParams.get('efg');
      if (efg) {
        const meta = JSON.parse(
          Buffer.from(efg, 'base64').toString('utf8'),
        ) as { vencode_tag?: string; video_id?: number | string };

        const tag = String(meta.vencode_tag ?? '');
        isAudio = /audio/i.test(tag);
        videoId = meta.video_id != null ? String(meta.video_id) : null;
        height = Number(tag.match(/_(\d{3,4})p/)?.[1] ?? 0);
      }
    } catch {
      // efg tidak terbaca — URL tetap disimpan sebagai kandidat cadangan.
    }

    sniffed.push({ url: clean, videoId, height, isAudio });
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

  // Ambil varian milik reel INI (video_id cocok dengan postId); kalau tidak
  // ada yang cocok, pakai apa pun yang tersadap sebagai cadangan. Dari
  // kandidat yang tersisa dipilih resolusi tertinggi supaya hasilnya tidak
  // buram — varian pertama yang lewat biasanya 360p.
  // Hanya varian milik reel INI: halaman reel mem-preload reel berikutnya,
  // jadi tanpa penyaringan bisa terambil video milik akun lain.
  const own = sniffed.filter(
    (item) => item.videoId === null || item.videoId === link.postId,
  );
  const pool = own.length > 0 ? own : sniffed;

  const bestVideo = pool
    .filter((item) => !item.isAudio)
    .sort((a, b) => b.height - a.height)[0];

  // DASH memberi resolusi tinggi tapi video dan audionya terpisah, sedangkan
  // varian progresif situs mobile sudah tergabung namun hanya 360p. Jadi
  // DASH digabung dengan ffmpeg bila kedua treknya tersedia; kalau tidak,
  // dipakai progresif mobile yang tetap bersuara meski resolusinya lebih
  // rendah — lebih baik daripada video bisu.
  // Urutan cadangan, dari kualitas terbaik ke paling aman:
  //   1. downloader pihak ketiga  -> 720p progresif (video + audio)
  //   2. progresif situs mobile   -> 360p, tetap bersuara
  //   3. varian DASH video saja   -> pilihan terakhir, tanpa audio
  //
  // Menggabungkan trek DASH dengan ffmpeg sempat dicoba, tapi tidak dipakai:
  // langkah 1 sudah mengembalikan berkas 720p yang video dan audionya
  // tergabung, sehingga ffmpeg hanya menambah ~80MB pada image tanpa manfaat.
  let videoUrl: string | null = link.isVideo
    ? await fetchDownloaderVideoUrl(link.postId)
    : null;

  if (!videoUrl) {
    videoUrl =
      (await fetchProgressiveVideoUrl(page, link.postId)) ??
      detail.ogVideo ??
      detail.videoSrc ??
      bestVideo?.url ??
      null;
  }

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
        // Untuk reel, membuka halaman detail tidak diperlukan: downloader
        // hanya butuh id postingan, dan satu-satunya data tambahan dari
        // halaman itu adalah caption — yang pada reel hampir selalu kosong.
        // Melewatinya memangkas ~5 detik per konten.
        if (scrapeMode === 'reels' && link.isVideo) {
          const fastUrl = await fetchDownloaderVideoUrl(link.postId);
          if (fastUrl) {
            posts.push({
              postId: link.postId,
              caption: '',
              mediaUrl: fastUrl,
              isVideo: true,
              thumbnailUrl: null,
              postUrl: link.href,
            });
            continue;
          }
          // Downloader gagal — jatuh ke jalur lengkap yang membuka halaman.
        }

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
