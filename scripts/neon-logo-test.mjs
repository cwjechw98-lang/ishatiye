import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('pages-site/out');
let server;
let browser;
try {
 let url = process.env.TEST_BASE_URL;
 if (!url) {
  server = createServer(async (req, res) => {
   try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/ishatiye/')) { res.writeHead(404).end(); return; }
    const file = resolve(root, pathname.slice('/ishatiye/'.length) || 'index.html');
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(await readFile(file));
   } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}/ishatiye/`;
 }
 browser = await chromium.launch({ channel: 'msedge', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(url, { waitUntil: 'networkidle' });
 const logo = page.getByRole('button', { name: 'Соушиал Бар — на главную', exact: true });
 assert.equal(await logo.count(), 1, 'Russian neon brand must exist');
 assert.equal(await logo.locator('.neon-name').textContent(), 'Соушиал');
 assert.equal(await logo.locator('.neon-fault').textContent(), 'шиа');
 await mkdir('.artifacts/neon-logo', { recursive: true });
 async function phase(time) {
  return page.evaluate(time => {
   const fault = document.querySelector('.neon-fault');
   const animation = fault.getAnimations().find(item => item.animationName === 'soul-sign-flicker');
   if (!animation) throw Error('Neon flicker animation missing');
   animation.pause(); animation.currentTime = time;
   return { opacity: Number(getComputedStyle(fault).opacity), fixed: [...document.querySelectorAll('.neon-fixed')].map(node => Number(getComputedStyle(node).opacity)), width: document.querySelector('.neon-name').getBoundingClientRect().width };
  }, time);
 }
 const lit = await phase(2000);
 assert.equal(lit.opacity, 1);
 await logo.screenshot({ path: '.artifacts/neon-logo/lit.png' });
 const unlit = await phase(9800);
 assert(unlit.opacity < 0.06, 'Only шиа must briefly go dark');
 assert(unlit.fixed.every(opacity => opacity === 1), 'Соу, л and Бар remain lit');
 assert.equal(lit.width, unlit.width, 'No jumping letters/layout');
 await logo.screenshot({ path: '.artifacts/neon-logo/soul.png' });
 await phase(11000);
 assert.equal((await phase(11000)).opacity, 1, 'Full name returns');
 await page.setViewportSize({ width: 390, height: 844 });
 await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
 assert(await logo.isVisible());
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
 await logo.screenshot({ path: '.artifacts/neon-logo/mobile.png' });
 await page.emulateMedia({ reducedMotion: 'reduce' });
 assert.equal(await logo.locator('.neon-fault').evaluate(node => getComputedStyle(node).animationName), 'none');
 assert.equal(await logo.locator('.neon-fault').evaluate(node => Number(getComputedStyle(node).opacity)), 1);
 assert.deepEqual(errors, []);
 console.log('PASS: Соушиал→Соу…л→Соушиал, stable letters/layout, mobile drawer, reduced motion and no browser errors');
} finally {
 await browser?.close();
 if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
