import { Injectable } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import { AccountEntity } from '../entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type InstagramPublishResult = {
  postUrl: string | null;
};

function getMediaType(filePath: string): 'image' | 'video' | 'unknown' {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video';
  return 'unknown';
}

async function findLatestPostUrl(
  page: Page,
  account: AccountEntity,
): Promise<string | null> {
  const username = account.credentials.username as string | undefined;
  if (!username) return null;

  try {
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const href = await page
      .locator('a[href*="/p/"], a[href*="/reel/"]')
      .first()
      .getAttribute('href');
    if (!href) return null;
    return `https://www.instagram.com${href}`;
  } catch {
    return null;
  }
}

@Injectable()
export class InstagramPublisher {
  async post(
    account: AccountEntity,
    options: { text: string; mediaPath?: string },
  ): Promise<InstagramPublishResult> {
    if (!options.mediaPath) {
      throw new Error(
        `Account ${account.id} (${account.label}): Instagram requires media, text-only post is not supported`,
      );
    }

    const cookies = account.credentials.cookies as
      | RawSessionCookie[]
      | undefined;
    if (!cookies || cookies.length === 0) {
      throw new Error(
        `Account ${account.id} (${account.label}) has no Instagram cookies configured`,
      );
    }

    const isVideo = getMediaType(options.mediaPath) === 'video';

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext({ userAgent: USER_AGENT });
      await context.addCookies(toPlaywrightCookies(cookies));

      const page = await context.newPage();
      try {
        await page.goto('https://www.instagram.com/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(3000);

        await page.locator('svg[aria-label="New post"]').first().click();
        await page.waitForTimeout(1000);
        await page.getByRole('link', { name: 'Post Post' }).click();
        await page.waitForTimeout(1500);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.first().setInputFiles(options.mediaPath);
        await page.waitForTimeout(isVideo ? 5000 : 2000);

        if (isVideo) {
          const reelsDialogOk = page.getByRole('button', { name: 'OK' });
          await reelsDialogOk
            .waitFor({ timeout: 8000 })
            .then(() => reelsDialogOk.click())
            .catch(() => {});
        }

        const selectCropButton = page
          .locator('svg[aria-label="Select crop"]')
          .locator('..');
        await selectCropButton
          .waitFor({ timeout: 8000 })
          .then(() => selectCropButton.click())
          .then(() =>
            page
              .getByText('Original', { exact: true })
              .click({ timeout: 5000 }),
          )
          .catch(() => {});
        await page.waitForTimeout(500);

        const nextButton = page.getByRole('button', { name: 'Next' });
        await nextButton.waitFor({ timeout: isVideo ? 60000 : 20000 });
        await nextButton.click();
        await page.waitForTimeout(1500);

        await nextButton.waitFor({ timeout: isVideo ? 30000 : 20000 });
        await nextButton.click();
        await page.waitForTimeout(1500);

        const captionBox = page.locator('[aria-label="Write a caption..."]');
        await captionBox.waitFor({ timeout: 20000 });
        await captionBox.click();
        if (options.text) {
          await captionBox.fill(options.text);
        }
        await page.waitForTimeout(500);

        const shareButton = page
          .getByRole('link', { name: 'Share' })
          .or(page.getByRole('button', { name: 'Share' }));
        await shareButton.first().waitFor({ timeout: 10000 });
        await shareButton.first().click();

        await page
          .waitForFunction(() => !document.body.innerText.includes('Sharing'), {
            timeout: isVideo ? 120000 : 30000,
          })
          .catch(() => {});
        await page.waitForTimeout(2000);

        return { postUrl: await findLatestPostUrl(page, account) };
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
}
