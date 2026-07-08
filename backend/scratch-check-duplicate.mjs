import { chromium } from 'playwright';

const FRONTEND = 'http://localhost:5173';
const SCRATCH = '/private/tmp/claude-501/-Users-rizkiramadhanx-project-lain-ternak-sosmed/8934240b-6619-414f-afdb-f89b093c137a/scratchpad';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /login/i }).click();
await page.waitForTimeout(2000);

await page.goto(`${FRONTEND}/scheduled-post`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);

await page.screenshot({ path: `${SCRATCH}/scheduled-post-page.png`, fullPage: true });
console.log('URL:', page.url());

const duplicateButtons = await page.getByRole('button', { name: 'Duplicate' }).count();
console.log('Duplicate buttons found:', duplicateButtons);

if (duplicateButtons > 0) {
  await page.getByRole('button', { name: 'Duplicate' }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCRATCH}/duplicate-modal.png`, fullPage: true });
  console.log('Modal screenshot taken');

  const gapLabel = await page.getByText('Jeda Antar Post (menit)').isVisible().catch(() => false);
  const waktuLabel = await page.getByText('Waktu Mulai (opsional)').isVisible().catch(() => false);
  console.log('Gap field visible:', gapLabel);
  console.log('Waktu Mulai field visible:', waktuLabel);
}

await browser.close();
