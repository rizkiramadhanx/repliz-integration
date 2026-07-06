import { Injectable } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import { AccountEntity } from '../entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type FacebookPublishResult = {
  postUrl: string | null;
};

function resolveProfilePath(account: AccountEntity): string | null {
  const cookies = account.credentials.cookies as RawSessionCookie[] | undefined;
  const cUserId = cookies?.find((c) => c.name === 'c_user')?.value;
  const username = account.credentials.username as string | undefined;

  if (username) return username;
  if (cUserId) return `profile.php?id=${cUserId}`;
  return null;
}

function extractPostIdentity(href: string): string {
  const fbidMatch = href.match(/fbid=(\d+)/);
  if (fbidMatch) return fbidMatch[1];
  const idMatch = href.match(/\/(posts|permalink|videos)\/(\d+)/);
  if (idMatch) return idMatch[2];
  return href.split('?')[0];
}

async function getTopProfilePostHref(
  page: Page,
  account: AccountEntity,
): Promise<string | null> {
  const profilePath = resolveProfilePath(account);
  if (!profilePath) return null;

  await page.goto(`https://www.facebook.com/${profilePath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const feedHeadingText = 'Postingan lainnya';
  const pinnedHeadingText = 'Postingan yang disematkan';
  const feedHeading = page.getByText(feedHeadingText, { exact: false }).first();
  const hasFeedHeading = await feedHeading.isVisible().catch(() => false);
  if (hasFeedHeading) {
    await feedHeading.scrollIntoViewIfNeeded().catch(() => {});
  } else {
    await page
      .getByText(pinnedHeadingText, { exact: false })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
  }
  await page.waitForTimeout(3000);

  const anchorText = hasFeedHeading ? feedHeadingText : pinnedHeadingText;
  return page.evaluate(
    ({ anchorText, selector }) => {
      const DOCUMENT_POSITION_FOLLOWING = 4;
      const spans = Array.from(document.querySelectorAll('span'));
      const anchor = spans.find((s) =>
        s.textContent?.trim().startsWith(anchorText),
      );
      if (!anchor) return null;

      const links = Array.from(document.querySelectorAll(selector)).filter(
        (el) =>
          anchor.compareDocumentPosition(el) & DOCUMENT_POSITION_FOLLOWING,
      );
      return links[0]?.getAttribute('href') ?? null;
    },
    {
      anchorText,
      selector:
        'a[href*="/posts/"], a[href*="/permalink/"], a[href*="/photo/"], a[href*="/videos/"]',
    },
  );
}

async function waitForNewPostUrl(
  page: Page,
  account: AccountEntity,
  previousTopPostHref: string | null,
): Promise<string | null> {
  const maxAttempts = 12;
  const retryDelayMs = 5000;
  const previousIdentity = previousTopPostHref
    ? extractPostIdentity(previousTopPostHref)
    : null;

  let lastHref: string | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      lastHref = await getTopProfilePostHref(page, account);
    } catch {
      lastHref = null;
    }

    if (lastHref && extractPostIdentity(lastHref) !== previousIdentity) {
      break;
    }
    await page.waitForTimeout(retryDelayMs);
  }

  if (!lastHref) return null;
  if (extractPostIdentity(lastHref) === previousIdentity) {
    return null;
  }
  if (lastHref.startsWith('http')) return lastHref;
  const origin = new URL(page.url()).origin;
  return `${origin}${lastHref}`;
}

async function fillComposerAndSubmit(
  page: Page,
  options: { text: string; mediaPath?: string },
): Promise<void> {
  await page.waitForTimeout(3000);

  const dialog = page.locator('div[role="dialog"] >> visible=true').first();
  await dialog.waitFor({ timeout: 15000 });

  const textbox = dialog
    .locator('div[role="textbox"][contenteditable="true"]')
    .first();
  await textbox.waitFor({ timeout: 15000 });
  await textbox.click();
  if (options.text) {
    await textbox.fill(options.text);
  }
  await page.waitForTimeout(500);

  if (options.mediaPath) {
    const photoVideoButton = dialog
      .locator('[aria-label="Photo/video"], [aria-label="Foto/video"]')
      .first();
    await photoVideoButton
      .waitFor({ timeout: 8000 })
      .then(() => photoVideoButton.click())
      .catch(() => {});

    const fileInput = dialog.locator('input[type="file"]').first();
    await fileInput.setInputFiles(options.mediaPath);
    await page.waitForTimeout(5000);
  }

  const postButton = dialog
    .locator('[aria-label="Post"], [aria-label="Kirim"]')
    .first();
  await postButton.waitFor({ timeout: 15000 });
  await postButton.click();

  const isVideo = options.mediaPath
    ? /\.(mp4|mov|avi|mkv|webm)$/i.test(options.mediaPath)
    : false;
  await dialog
    .waitFor({ state: 'detached', timeout: isVideo ? 120000 : 30000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
}

@Injectable()
export class FacebookPublisher {
  async postToWall(
    account: AccountEntity,
    options: { text: string; mediaPath?: string },
  ): Promise<FacebookPublishResult> {
    const cookies = account.credentials.cookies as
      | RawSessionCookie[]
      | undefined;
    if (!cookies || cookies.length === 0) {
      throw new Error(
        `Account ${account.id} (${account.label}) has no Facebook cookies configured`,
      );
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext({ userAgent: USER_AGENT });
      await context.addCookies(toPlaywrightCookies(cookies));

      const page = await context.newPage();
      try {
        const previousTopPostHref = await getTopProfilePostHref(
          page,
          account,
        ).catch(() => null);

        await page.goto('https://www.facebook.com/', {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await page.waitForTimeout(3000);

        const composerRegion = page
          .locator(
            '[aria-label="Create a post"], [aria-label="Buat postingan"]',
          )
          .first();
        await composerRegion.waitFor({ timeout: 20000 });
        const composerTrigger = composerRegion
          .locator('div[role="button"]')
          .first();
        await composerTrigger.waitFor({ timeout: 10000 });
        await composerTrigger.click();

        await fillComposerAndSubmit(page, options);

        return {
          postUrl: await waitForNewPostUrl(page, account, previousTopPostHref),
        };
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }

  async postToGroup(
    account: AccountEntity,
    groupId: string,
    options: { text: string; mediaPath?: string },
  ): Promise<FacebookPublishResult> {
    const cookies = account.credentials.cookies as
      | RawSessionCookie[]
      | undefined;
    if (!cookies || cookies.length === 0) {
      throw new Error(
        `Account ${account.id} (${account.label}) has no Facebook cookies configured`,
      );
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext({ userAgent: USER_AGENT });
      await context.addCookies(toPlaywrightCookies(cookies));

      const page = await context.newPage();
      try {
        await page.goto(`https://www.facebook.com/groups/${groupId}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await page.waitForTimeout(3000);

        // Composer grup memakai region "Write something..."/"Tulis sesuatu..."
        // (beda dari wall yang aria-label-nya "Create a post"). Selector ini
        // best-effort — belum ada referensi resmi dari master-scrape untuk grup,
        // perlu divalidasi manual saat testing nyata.
        const composerRegion = page
          .locator(
            '[aria-label="Write something..."], [aria-label="Tulis sesuatu..."]',
          )
          .first();
        await composerRegion.waitFor({ timeout: 20000 });
        await composerRegion.click();

        await fillComposerAndSubmit(page, options);

        return { postUrl: null };
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
}
