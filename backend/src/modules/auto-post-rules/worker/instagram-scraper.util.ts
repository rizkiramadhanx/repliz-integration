import { Page, chromium } from 'playwright';
import { AccountEntity } from '../../accounts/entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../../accounts/connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface ScrapedInstagramPost {
  shortcode: string;
  caption: string;
  mediaUrl: string;
  isVideo: boolean;
  thumbnailUrl: string | null;
}

function extractCaption(ogDescription: string | null): string {
  if (!ogDescription) return '';
  const match = ogDescription.trim().match(/:\s*"([\s\S]*)"\.?$/);
  return match ? match[1].trim() : '';
}

async function readShortcodesFromDom(
  page: Page,
): Promise<{ shortcode: string; isVideo: boolean }[]> {
  const links = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', (els) =>
    els
      .map((el) => el.getAttribute('href') ?? '')
      .filter(Boolean)
      .map((href) => ({
        href,
        isVideo: href.includes('/reel/'),
      })),
  );

  const seen = new Set<string>();
  const result: { shortcode: string; isVideo: boolean }[] = [];
  for (const link of links) {
    const match = link.href.match(/\/(?:p|reel)\/([^/]+)\/?/);
    const shortcode = match?.[1];
    if (!shortcode || seen.has(shortcode)) continue;
    seen.add(shortcode);
    result.push({ shortcode, isVideo: link.isVideo });
  }
  return result;
}

export type InstagramScrapeMode = 'posts' | 'reels';

async function listRecentShortcodes(
  page: Page,
  targetUsername: string,
  limit: number,
  excludeShortcodes: Set<string> = new Set(),
  scrapeMode: InstagramScrapeMode = 'posts',
): Promise<{ shortcode: string; isVideo: boolean }[]> {
  const path = scrapeMode === 'reels' ? `${targetUsername}/reels/` : `${targetUsername}/`;
  await page.goto(`https://www.instagram.com/${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const MAX_SCROLL_ATTEMPTS = 40;
  const MAX_CONSECUTIVE_NO_PROGRESS = 5;
  let attempts = 0;
  let consecutiveNoProgress = 0;
  let domItems = await readShortcodesFromDom(page);
  let fresh = domItems.filter((item) => !excludeShortcodes.has(item.shortcode));

  while (fresh.length < limit && attempts < MAX_SCROLL_ATTEMPTS) {
    const previousCount = domItems.length;
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(3500);
    attempts += 1;

    domItems = await readShortcodesFromDom(page);
    fresh = domItems.filter((item) => !excludeShortcodes.has(item.shortcode));

    if (domItems.length === previousCount) {
      consecutiveNoProgress += 1;
      if (consecutiveNoProgress >= MAX_CONSECUTIVE_NO_PROGRESS) break;
    } else {
      consecutiveNoProgress = 0;
    }
  }

  return fresh.slice(0, limit);
}

function findKeyDeep(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[key];
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const found = findKeyDeep(value, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

interface EmbeddedMediaItem {
  has_audio?: boolean;
  video_versions?: Array<{ url: string }>;
  image_versions2?: {
    candidates?: Array<{ url: string; width: number; height: number }>;
  };
}

async function findMediaItemFromEmbeddedJson(
  page: Page,
  shortcode: string,
): Promise<EmbeddedMediaItem | null> {
  const allScripts = await page.$$eval('script[type="application/json"]', (els) =>
    els.map((el) => el.textContent ?? ''),
  );

  // Jalur normal: post/reel diakses lewat /p/ atau /reel/ (dengan username)
  // membawa blok "xdt_api__v1__media__shortcode__web_info" berisi items[0].
  const webInfoCandidates = allScripts.filter((text) =>
    text.includes('xdt_api__v1__media__shortcode__web_info'),
  );
  for (const raw of webInfoCandidates) {
    try {
      const parsed = JSON.parse(raw);
      const webInfo = findKeyDeep(
        parsed,
        'xdt_api__v1__media__shortcode__web_info',
      ) as { items?: EmbeddedMediaItem[] } | undefined;
      const item = webInfo?.items?.[0];
      if (item) return item;
    } catch {
      continue;
    }
  }

  // Fallback: Instagram kadang redirect /reel/{shortcode}/ (tanpa username)
  // ke tab Clips (/reels/{shortcode}/), yang membawa blok berbeda
  // ("xdt_api__v1__clips__home__connection_v2") tanpa struktur items[0].
  // Cari langsung node media yang shortcode-nya cocok lewat traversal generik.
  const clipsCandidates = allScripts.filter(
    (text) => text.includes('video_versions') && text.includes(shortcode),
  );
  for (const raw of clipsCandidates) {
    try {
      const parsed = JSON.parse(raw);
      const code = findKeyDeep(parsed, 'code');
      if (code !== shortcode) continue;
      const videoVersions = findKeyDeep(parsed, 'video_versions') as
        | EmbeddedMediaItem['video_versions']
        | undefined;
      const imageVersions2 = findKeyDeep(parsed, 'image_versions2') as
        | EmbeddedMediaItem['image_versions2']
        | undefined;
      if (videoVersions || imageVersions2) {
        return { video_versions: videoVersions, image_versions2: imageVersions2 };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]).catch(() => null);
}

async function scrapePostDetail(
  page: Page,
  targetUsername: string,
  shortcode: string,
  isVideo: boolean,
): Promise<ScrapedInstagramPost | null> {
  const kind = isVideo ? 'reel' : 'p';
  const usernamePrefix = targetUsername ? `${targetUsername}/` : '';

  await page.goto(
    `https://www.instagram.com/${usernamePrefix}${kind}/${shortcode}/`,
    { waitUntil: 'domcontentloaded', timeout: 30000 },
  );
  await page.waitForTimeout(2000);

  const ogDescription = await page
    .$eval(
      'meta[property="og:description"]',
      (el) => (el as HTMLMetaElement).content,
    )
    .catch(() => null);

  const mediaItem = await withTimeout(
    findMediaItemFromEmbeddedJson(page, shortcode),
    10000,
  );

  let resolvedVideoUrl: string | null = null;
  if (isVideo) {
    const videoUrl = mediaItem?.video_versions?.[0]?.url;
    if (videoUrl) {
      resolvedVideoUrl = videoUrl;
    } else {
      resolvedVideoUrl = await page
        .$eval(
          'meta[property="og:video"]',
          (el) => (el as HTMLMetaElement).content,
        )
        .catch(() => null);
    }
  }

  if (isVideo && !resolvedVideoUrl) {
    return null;
  }

  const highResImage = mediaItem?.image_versions2?.candidates?.[0]?.url;
  const ogImage = await page
    .$eval('meta[property="og:image"]', (el) => (el as HTMLMetaElement).content)
    .catch(() => null);
  const mediaUrl = resolvedVideoUrl ?? highResImage ?? ogImage;
  if (!mediaUrl) return null;

  // Untuk video, og:image tetap ada (cover frame yang di-generate Instagram
  // sendiri) — dipakai sebagai preview gambar terpisah dari mediaUrl (video
  // asli yang dipublish), supaya UI bisa tampilkan thumbnail untuk video juga.
  const thumbnailUrl = isVideo ? ogImage : mediaUrl;

  return {
    shortcode,
    caption: extractCaption(ogDescription),
    mediaUrl,
    isVideo,
    thumbnailUrl,
  };
}

function requireCookies(browsingAccount: AccountEntity): RawSessionCookie[] {
  const cookies = browsingAccount.credentials.cookies as
    | RawSessionCookie[]
    | undefined;
  if (!cookies || cookies.length === 0) {
    throw new Error(
      `Account ${browsingAccount.id} (${browsingAccount.label}) has no Instagram cookies configured`,
    );
  }
  return cookies;
}

async function withInstagramSession<T>(
  browsingAccount: AccountEntity,
  run: (page: Page) => Promise<T>,
): Promise<T> {
  const cookies = requireCookies(browsingAccount);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    await context.addCookies(toPlaywrightCookies(cookies));

    const page = await context.newPage();
    try {
      return await run(page);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function assertLoggedIn(
  page: Page,
  browsingAccount: AccountEntity,
): Promise<void> {
  const isLoggedIn = await page
    .locator('svg[aria-label="Home"], a[href="/"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (!isLoggedIn) {
    throw new Error(
      `Akun browsing (${browsingAccount.label}) sepertinya tidak sedang login ke Instagram — cookie kemungkinan sudah expired.`,
    );
  }
}

async function assertNotPrivateWall(
  page: Page,
  browsingAccount: AccountEntity,
  targetUsername: string,
): Promise<void> {
  const isPrivateWall = await page
    .locator('text=/This Account is Private|Akun Ini Bersifat Pribadi/i')
    .first()
    .isVisible()
    .catch(() => false);
  if (isPrivateWall) {
    throw new Error(
      `Akun @${targetUsername} bersifat private — akun browsing (${browsingAccount.label}) harus follow dan diterima terlebih dahulu.`,
    );
  }
}

export async function scrapeLatestInstagramPosts(
  browsingAccount: AccountEntity,
  targetUsername: string,
  limit = 5,
  excludeShortcodes: Set<string> = new Set(),
  scrapeMode: InstagramScrapeMode = 'posts',
): Promise<ScrapedInstagramPost[]> {
  return withInstagramSession(browsingAccount, async (page) => {
    const shortcodes = await listRecentShortcodes(
      page,
      targetUsername,
      limit,
      excludeShortcodes,
      scrapeMode,
    );

    if (shortcodes.length === 0) {
      await assertLoggedIn(page, browsingAccount);
      await assertNotPrivateWall(page, browsingAccount, targetUsername);
      return [];
    }

    const posts: ScrapedInstagramPost[] = [];
    for (const { shortcode, isVideo } of shortcodes) {
      const post = await scrapePostDetail(
        page,
        targetUsername,
        shortcode,
        isVideo,
      );
      if (post) posts.push(post);
    }
    return posts;
  });
}

function parseShortcodeAndTypeFromUrl(url: string): {
  shortcode: string;
  isVideo: boolean;
} {
  const match = url.match(/\/(p|reel)\/([^/?]+)/);
  if (!match) {
    throw new Error(
      `URL tidak valid, tidak ditemukan format /p/ atau /reel/: ${url}`,
    );
  }
  return { shortcode: match[2], isVideo: match[1] === 'reel' };
}

export async function scrapeInstagramPostByUrl(
  browsingAccount: AccountEntity,
  postUrl: string,
): Promise<ScrapedInstagramPost | null> {
  const { shortcode, isVideo } = parseShortcodeAndTypeFromUrl(postUrl);
  return withInstagramSession(browsingAccount, async (page) => {
    const post = await scrapePostDetail(page, '', shortcode, isVideo);
    if (!post) {
      await assertLoggedIn(page, browsingAccount);
    }
    return post;
  });
}
