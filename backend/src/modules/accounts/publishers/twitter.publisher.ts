import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { AccountEntity } from '../entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type TwitterPublishResult = {
  postUrl: string | null;
};

function getMediaType(filePath: string): 'image' | 'video' | 'unknown' {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video';
  return 'unknown';
}

@Injectable()
export class TwitterPublisher {
  async post(
    account: AccountEntity,
    options: { text: string; mediaPath?: string },
  ): Promise<TwitterPublishResult> {
    const cookies = account.credentials.cookies as
      | RawSessionCookie[]
      | undefined;
    if (!cookies || cookies.length === 0) {
      throw new Error(
        `Account ${account.id} (${account.label}) has no Twitter cookies configured`,
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
        await page.goto('https://x.com/home', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(3000);

        const placeholder = page.locator(
          '[data-testid="tweetTextarea_0RichTextInputContainer"]',
        );
        await placeholder.waitFor({ timeout: 15000 });
        await placeholder.click();
        await page.waitForTimeout(1000);

        const tweetBox = page.locator('[data-testid="tweetTextarea_0"]');
        await tweetBox.waitFor({ timeout: 10000 });
        await tweetBox.fill(options.text);
        await page.waitForTimeout(500);

        if (options.mediaPath) {
          const fileInput = page.locator('input[data-testid="fileInput"]');
          await fileInput.setInputFiles(options.mediaPath);

          const isVideo = getMediaType(options.mediaPath) === 'video';
          await page.waitForTimeout(isVideo ? 15000 : 4000);
          if (isVideo) {
            await page
              .waitForFunction(
                () => !document.querySelector('[data-testid="progressBar"]'),
                { timeout: 120000 },
              )
              .catch(() => {});
          }
        }

        const postButton = page.locator(
          '[data-testid="tweetButtonInline"]:not([disabled])',
        );
        await postButton.waitFor({ timeout: 30000 });

        const responsePromise = page
          .waitForResponse(
            (res) =>
              res.url().includes('/CreateTweet') &&
              res.request().method() === 'POST',
            { timeout: 30000 },
          )
          .catch(() => null);

        await postButton.evaluate((el: HTMLElement) => el.click());
        const response = await responsePromise;
        await page.waitForTimeout(2000);

        if (!response) {
          throw new Error(
            'Tidak menerima response /CreateTweet dari Twitter — tweet kemungkinan tidak terkirim',
          );
        }

        let body: unknown;
        try {
          body = await response.json();
        } catch (err) {
          throw new Error(
            `Gagal parse response /CreateTweet dari Twitter: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }

        const parsedBody = body as {
          data?: {
            create_tweet?: {
              tweet_results?: {
                result?: {
                  rest_id?: string;
                  legacy?: { id_str?: string };
                };
              };
            };
          };
          errors?: { message?: string }[];
        };

        const tweetId =
          parsedBody?.data?.create_tweet?.tweet_results?.result?.rest_id ??
          parsedBody?.data?.create_tweet?.tweet_results?.result?.legacy?.id_str;

        if (!tweetId) {
          const errors = parsedBody?.errors;
          const reason =
            Array.isArray(errors) && errors.length > 0
              ? errors
                  .map((e) => e.message)
                  .filter(Boolean)
                  .join('; ')
              : JSON.stringify(body).slice(0, 500);
          throw new Error(
            `Response /CreateTweet dari Twitter tidak mengandung tweet id — ${reason}`,
          );
        }

        const username =
          (account.credentials.username as string | undefined) ?? 'i';
        return { postUrl: `https://x.com/${username}/status/${tweetId}` };
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
}
