import { Page, chromium } from 'playwright';
import { fetchViaAndaraz } from './andaraz.util';
import { AccountEntity } from '../../accounts/entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../../accounts/connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface ScrapedTiktokPost {
  videoId: string;
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
      `Account ${browsingAccount.id} (${browsingAccount.label}) belum punya cookies TikTok`,
    );
  }
  return cookies;
}

const SESSION_HARD_TIMEOUT_MS = 6 * 60 * 1000;

// Pola yang sama seperti scraper Instagram/Facebook: `run()` di-race dengan
// deadline agar loop scroll yang tidak pernah selesai tidak membuat proses
// Chromium menggantung selamanya.
async function withTiktokSession<T>(
  browsingAccount: AccountEntity,
  run: (page: Page) => Promise<T>,
): Promise<T> {
  const cookies = requireCookies(browsingAccount);

  const browser = await chromium.launch({
    headless: true,
    // Menyembunyikan penanda otomatisasi bawaan Chromium. TikTok memeriksa
    // sinyal ini dan lebih sering menampilkan CAPTCHA bila terdeteksi.
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  let deadlineTimer: NodeJS.Timeout;
  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(
      () => reject(new Error('Sesi scraping TikTok timeout (melebihi 6 menit)')),
      SESSION_HARD_TIMEOUT_MS,
    );
  });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 900 },
      locale: 'id-ID',
    });

    // navigator.webdriver bernilai true pada browser yang dikendalikan
    // otomatis; TikTok memakainya sebagai salah satu sinyal deteksi bot.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

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

// TikTok menampilkan beberapa lapis penghalang: modal login/"buka di aplikasi"
// yang bisa ditutup, dan CAPTCHA puzzle yang TIDAK bisa dilewati otomatis.
// Keduanya dibedakan supaya pesan errornya menunjuk sebab yang benar —
// CAPTCHA berarti cookies perlu diperbarui, bukan selector yang salah.
async function dismissOverlays(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      // Tutup modal lewat tombol close bila ada.
      const closeSelectors = [
        '[data-e2e="modal-close-inner-button"]',
        '[data-e2e="close-button"]',
        'button[aria-label*="lose" i]',
        'div[role="dialog"] button[type="button"]',
      ];
      for (const selector of closeSelectors) {
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          try {
            el.click();
          } catch {
            // tombol bisa saja sudah lepas dari DOM
          }
        });
      }

      // Sebagian overlay tidak punya tombol tutup dan hanya menghalangi
      // scroll; dihapus langsung agar konten di belakangnya tetap terbaca.
      document
        .querySelectorAll<HTMLElement>('[class*="TUXModal-overlay"]')
        .forEach((el) => {
          if (!el.querySelector('[class*="captcha" i]')) el.remove();
        });
    })
    .catch(() => undefined);

  // Tombol Escape menutup sebagian dialog yang tidak merespons klik.
  await page.keyboard.press('Escape').catch(() => undefined);
}

async function assertNotBlocked(page: Page): Promise<void> {
  const blocked = await page
    .evaluate(() => {
      const captcha = document.querySelector(
        '.captcha-verify-container, [class*="captcha-verify" i]',
      );
      return {
        captcha: !!captcha,
        loginWall: /log in to tiktok|masuk ke tiktok/i.test(
          document.body?.innerText?.slice(0, 400) ?? '',
        ),
      };
    })
    .catch(() => ({ captcha: false, loginWall: false }));

  if (blocked.captcha) {
    throw new Error(
      'TikTok menampilkan CAPTCHA — cookies akun pemantau kemungkinan kedaluwarsa atau akunnya sedang dibatasi. Perbarui cookies di menu Account.',
    );
  }
  if (blocked.loginWall) {
    throw new Error(
      'TikTok meminta login — cookies akun pemantau tidak valid. Perbarui cookies di menu Account.',
    );
  }
}

function normalizeUsername(target: string): string {
  const trimmed = target.trim().replace(/^@+/, '');

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const match = url.pathname.match(/@([^/]+)/);
      if (match?.[1]) return match[1];
    } catch {
      // bukan URL valid — perlakukan sebagai username biasa
    }
  }
  return trimmed;
}

async function readVideoIdsFromDom(page: Page): Promise<string[]> {
  const hrefs = await page.$$eval('a[href*="/video/"]', (els) =>
    els.map((el) => el.getAttribute('href') ?? '').filter(Boolean),
  );

  const seen = new Set<string>();
  for (const href of hrefs) {
    const id = href.match(/\/video\/(\d{15,25})/)?.[1];
    if (id) seen.add(id);
  }
  return Array.from(seen);
}

async function listRecentVideoIds(
  page: Page,
  username: string,
  limit: number,
  excludeIds: Set<string>,
): Promise<string[]> {
  await page.goto(`https://www.tiktok.com/@${username}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await page.waitForTimeout(5000);

  await dismissOverlays(page);
  await assertNotBlocked(page);

  const MAX_SCROLL_ATTEMPTS = Math.min(40, Math.max(8, limit));
  const MAX_CONSECUTIVE_NO_PROGRESS = 3;

  let attempts = 0;
  let consecutiveNoProgress = 0;
  let all = await readVideoIdsFromDom(page);
  let fresh = all.filter((id) => !excludeIds.has(id));

  // Berhenti saat jumlah konten BARU cukup, bukan saat total cukup: profil
  // yang sebagian besar isinya sudah pernah disinkron akan berhenti terlalu
  // dini bila memakai total.
  while (fresh.length < limit && attempts < MAX_SCROLL_ATTEMPTS) {
    const previousCount = all.length;
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(2000);
    attempts += 1;

    // Modal login sering baru muncul setelah beberapa kali scroll, jadi
    // dibersihkan berulang — bukan sekali di awal saja.
    if (attempts % 3 === 0) await dismissOverlays(page);

    all = await readVideoIdsFromDom(page);
    fresh = all.filter((id) => !excludeIds.has(id));

    if (all.length === previousCount) {
      consecutiveNoProgress += 1;
      if (consecutiveNoProgress >= MAX_CONSECUTIVE_NO_PROGRESS) break;
    } else {
      consecutiveNoProgress = 0;
    }
  }

  if (all.length === 0) await assertNotBlocked(page);
  return fresh.slice(0, limit);
}

// Detail video diambil lewat downloader, bukan dengan membuka halaman video
// satu per satu: selain jauh lebih cepat, responsnya sudah memuat caption
// (`title`) dan URL HD yang video dan audionya tergabung.
async function fetchVideoDetail(
  username: string,
  videoId: string,
): Promise<ScrapedTiktokPost | null> {
  const postUrlForAndaraz = `https://www.tiktok.com/@${username}/video/${videoId}`;

  // Andaraz dicoba lebih dulu; bila gagal, jalur ttdl di bawah tetap dipakai.
  const viaAndaraz = await fetchViaAndaraz(postUrlForAndaraz, 'tiktok');
  if (viaAndaraz?.mediaUrls.length) {
    return {
      videoId,
      caption: viaAndaraz.caption,
      mediaUrl: viaAndaraz.mediaUrls[0],
      isVideo: viaAndaraz.isVideo,
      thumbnailUrl: null,
      postUrl: postUrlForAndaraz,
    };
  }

  try {
    // require dipakai agar kegagalan memuat modul pihak ketiga tidak
    // menggagalkan seluruh scraper saat paketnya belum terpasang.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ttdl } = require('ruhend-scraper') as {
      ttdl: (url: string) => Promise<Record<string, string>>;
    };

    const postUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;
    const data = await Promise.race([
      ttdl(postUrl),
      new Promise<Record<string, string>>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 45000),
      ),
    ]);

    // `video` diutamakan meski namanya bukan "hd": varian `video_hd` dari
    // TikTok memakai codec HEVC/H.265 (diuji pada beberapa video, konsisten),
    // yang tidak didukung banyak pemutar dan berisiko ditolak Repliz.
    // `video` memakai H.264 yang kompatibel luas — dan ukurannya pun sering
    // lebih besar, jadi kualitasnya tidak kalah.
    // `video_wm` sengaja tidak dipakai karena memuat watermark TikTok.
    const mediaUrl = data?.video || data?.video_hd || null;
    if (!mediaUrl) return null;

    return {
      videoId,
      caption: data?.title ?? '',
      mediaUrl,
      isVideo: true,
      thumbnailUrl: data?.cover ?? null,
      postUrl,
    };
  } catch {
    return null;
  }
}

export async function scrapeLatestTiktokPosts(
  browsingAccount: AccountEntity,
  target: string,
  limit = 5,
  excludeIds: Set<string> = new Set(),
): Promise<ScrapedTiktokPost[]> {
  const username = normalizeUsername(target);

  const videoIds = await withTiktokSession(browsingAccount, (page) =>
    listRecentVideoIds(page, username, limit, excludeIds),
  );

  const posts: ScrapedTiktokPost[] = [];
  for (const videoId of videoIds) {
    // Satu video gagal (dihapus / dibatasi) tidak boleh menggagalkan batch.
    const post = await fetchVideoDetail(username, videoId);
    if (post) posts.push(post);
  }
  return posts;
}
