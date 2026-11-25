// debug-flow.mjs — step-by-step trace of stove pickup + assembly.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const GAME_DIR = '/home/hatch/workspace/make-fun/2026-11-25/best-cooking-game-20261125-0137/repo/game';
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = join(GAME_DIR, req.url === '/' ? 'index.html' : decodeURIComponent(req.url));
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForTimeout(500);
const dump = async (label) => {
  const s = await page.evaluate(() => {
    const st = window.__LADLE__.state;
    return JSON.stringify({
      hand: st.hand, px: Math.round(st.player.x), py: Math.round(st.player.y),
      stove: st.stove.map((x) => x.stage), board: st.board.done, assembly: st.assembly.plate?.contents.length ?? null,
      screen: st.screen,
    });
  });
  console.log(label, s);
};

await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.evaluate(() => window.__LADLE__.teleport(245, 280));
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
await dump('after grab patty');
await page.evaluate(() => window.__LADLE__.teleport(1100, 460));
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
await dump('after place on stove');
await page.waitForTimeout(4500);
await dump('after cook wait');
await page.keyboard.press('KeyE');
await page.waitForTimeout(300);
await dump('after pickup E');
await browser.close();
server.close();
