import { Injectable } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import { AccountEntity } from '../entities/account.entity';
import { RawSessionCookie, toPlaywrightCookies } from './cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

type CookieSessionType = 'twitter' | 'facebook' | 'instagram';

const CHECK_CONFIG: Record<
  CookieSessionType,
  { homeUrl: string; loggedInSelector: string }
> = {
  twitter: {
    homeUrl: 'https://x.com/home',
    // Elemen yang hanya render kalau benar-benar login (compose tweet box / primary column)
    loggedInSelector:
      '[data-testid="SideNav_NewTweet_Button"], [data-testid="primaryColumn"]',
  },
  facebook: {
    homeUrl: 'https://www.facebook.com/',
    loggedInSelector: '[aria-label="Facebook"], div[role="feed"]',
  },
  instagram: {
    homeUrl: 'https://www.instagram.com/',
    loggedInSelector: 'svg[aria-label="Home"], a[href="/"]',
  },
};

// Link nav "Profile" milik akun sendiri selalu ada di halaman home saat login —
// dipakai untuk auto-detect username tanpa perlu input manual. Facebook tidak
// disertakan karena URL profilnya sering numeric ID, bukan username.
async function extractUsername(
  page: Page,
  type: CookieSessionType,
): Promise<string | undefined> {
  try {
    if (type === 'instagram') {
      const href = await page
        .locator('a[href^="/"]')
        .filter({ hasText: 'Profile' })
        .first()
        .getAttribute('href', { timeout: 5000 });
      const match = href?.match(/^\/([a-zA-Z0-9._]+)\/?$/);
      return match?.[1];
    }
    if (type === 'twitter') {
      const href = await page
        .locator('[data-testid="AppTabBar_Profile_Link"]')
        .first()
        .getAttribute('href', { timeout: 5000 });
      const match = href?.match(/^\/([a-zA-Z0-9_]+)$/);
      return match?.[1];
    }
  } catch {
    // Best-effort — kalau selector berubah/tidak ketemu, biarkan username lama tidak berubah
  }
  return undefined;
}

@Injectable()
export class CookieSessionChecker {
  async check(
    account: AccountEntity & { type: CookieSessionType },
  ): Promise<{ ok: boolean; error?: string; username?: string }> {
    const cookies = account.credentials.cookies as
      | RawSessionCookie[]
      | undefined;
    if (!cookies || cookies.length === 0) {
      return {
        ok: false,
        error: 'credentials.cookies tidak ditemukan atau kosong',
      };
    }

    const config = CHECK_CONFIG[account.type];
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext({ userAgent: USER_AGENT });
      await context.addCookies(toPlaywrightCookies(cookies));

      const page = await context.newPage();
      try {
        await page.goto(config.homeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });

        const url = new URL(page.url());
        const isLoginPage = /login|checkpoint|recover/i.test(url.pathname);
        if (isLoginPage) {
          return {
            ok: false,
            error: `Diarahkan ke halaman login (${url.pathname}) — cookie kadaluarsa`,
          };
        }

        const loggedInEl = await page
          .locator(config.loggedInSelector)
          .first()
          .waitFor({ state: 'attached', timeout: 8000 })
          .then(() => true)
          .catch(() => false);

        if (!loggedInEl) {
          return {
            ok: false,
            error:
              'Elemen halaman yang menandakan sesi aktif tidak ditemukan — cookie kemungkinan tidak valid',
          };
        }

        const username = await extractUsername(page, account.type);
        return { ok: true, username };
      } finally {
        await page.close();
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      await browser.close();
    }
  }
}
