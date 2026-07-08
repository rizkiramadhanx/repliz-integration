import { Injectable } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import { AccountEntity } from '../entities/account.entity';
import {
  RawSessionCookie,
  toPlaywrightCookies,
} from '../connection-check/cookies';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type FacebookGroup = {
  id: string;
  name: string;
};

@Injectable()
export class FacebookGroupsScraper {
  async listMyGroups(account: AccountEntity): Promise<FacebookGroup[]> {
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
        await page.goto('https://web.facebook.com/groups/joins/?nav_source=tab', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(3000);

        const isLoginPage = /login|checkpoint|recover/i.test(
          new URL(page.url()).pathname,
        );
        if (isLoginPage) {
          throw new Error('Cookie Facebook kadaluarsa — diarahkan ke halaman login');
        }

        const MAX_SCROLL_ATTEMPTS = 20;
        const MAX_CONSECUTIVE_NO_PROGRESS = 5;
        let attempts = 0;
        let consecutiveNoProgress = 0;
        let groups = await this.readGroupsFromDom(page);

        while (attempts < MAX_SCROLL_ATTEMPTS) {
          const previousCount = groups.length;
          await page.mouse.wheel(0, 4000);
          await page.waitForTimeout(3000);
          attempts += 1;

          groups = await this.readGroupsFromDom(page);
          if (groups.length === previousCount) {
            consecutiveNoProgress += 1;
            if (consecutiveNoProgress >= MAX_CONSECUTIVE_NO_PROGRESS) break;
          } else {
            consecutiveNoProgress = 0;
          }
        }

        return groups;
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }

  private async readGroupsFromDom(page: Page): Promise<FacebookGroup[]> {
    const links = await page.$$eval('a[href*="/groups/"]', (els) =>
      els
        .map((el) => ({
          href: el.getAttribute('href') ?? '',
          text: el.textContent?.trim() ?? '',
        }))
        .filter((item) => item.href && item.text),
    );

    const seen = new Map<string, string>();
    for (const { href, text } of links) {
      const match = href.match(/\/groups\/(\d+)\/?/);
      if (!match) continue;
      const id = match[1];
      if (!seen.has(id) && text) {
        seen.set(id, text);
      }
    }

    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }
}
