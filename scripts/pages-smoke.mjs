import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = resolve('pages-site/out');
const base = '/ishatiye/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
let server;
let browser;
try {
  let url = process.env.TEST_BASE_URL;
  if (!url) {
    server = createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (!pathname.startsWith(base)) { res.writeHead(404).end(); return; }
        const path = resolve(root, pathname.slice(base.length) || 'index.html');
        if (!path.startsWith(root + '\\') && !path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
        const data = await readFile(path);
        res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }).end(data);
      } catch { res.writeHead(404).end(); }
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${server.address().port}${base}`;
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  page.on('request', r => { if (new URL(r.url()).pathname.includes('/api/')) errors.push(`Unexpected API request: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  assert.match(await page.locator('body').innerText(), /демо/i);
  assert.equal(await page.locator('img').evaluateAll(images => images.filter(i => !i.complete || i.naturalWidth === 0).length), 0, 'broken images');
  console.log('Desktop loaded:', await page.title());
  await page.getByRole('button', { name: 'Общий чат', exact: true }).click();
  const message = `Проверка демо ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Текст сообщения', exact: true }).fill(message);
  await page.getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
  await page.getByText(message, { exact: true }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Общий чат', exact: true }).click();
  await page.getByText(message, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Пригласить друзей', exact: true }).first().click();
  await page.getByAltText('QR-код для входа в пространство бара Место', { exact: true }).waitFor();
  assert.match(await page.locator('input[readonly]').inputValue(), /\/ishatiye\/\?venue=mesto$/);
  await page.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(overflow, false, 'mobile horizontal overflow');
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile, demo notice, images, no API calls or browser errors');
} finally {
  await browser?.close();
  if (server) await new Promise(r => server.close(r));
}
