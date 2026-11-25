// playtest.mjs — Serves repo/game over localhost, drives The Golden Ladle
// in headless Chromium, runs the full playtest checklist, and takes the
// 4 submission screenshots. Run: node playtest.mjs [shots|test|all]
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = '/home/hatch/workspace/make-fun/2026-11-25/best-cooking-game-20261125-0137';
const GAME_DIR = join(ROOT, 'repo/game');
const SHOT_DIR = join(ROOT, 'repo/screenshots');
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const MODE = process.argv[2] || 'all';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const p = join(GAME_DIR, req.url === '/' ? 'index.html' : decodeURIComponent(req.url));
  if (!existsSync(p) || !p.startsWith(GAME_DIR)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await page.waitForTimeout(800);
const hasLadle = await page.evaluate(() => !!window.__LADLE__);
check('game boots, debug handle present', hasLadle);

async function shot(name, file) {
  const path = join(SHOT_DIR, file);
  await page.locator('#game').screenshot({ type: 'jpeg', quality: 82, path });
  const kb = Math.round(statSync(path).size / 1024);
  console.log(`SHOT ${file}: ${kb} KiB`);
  return kb;
}

if (MODE === 'test' || MODE === 'all') {
  // 1. title screen visible
  check('title screen shown', await page.evaluate(() => window.__LADLE__.state.screen === 'title'));

  // 2. start with Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check('Enter starts shift', await page.evaluate(() => window.__LADLE__.state.screen === 'playing'));
  check('two opening orders', await page.evaluate(() => window.__LADLE__.state.orders.length === 2));

  // 3. keyboard movement (real keys)
  const x0 = await page.evaluate(() => window.__LADLE__.state.player.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const x1 = await page.evaluate(() => window.__LADLE__.state.player.x);
  check('keyboard moves chef right', x1 > x0 + 50, `x ${Math.round(x0)} -> ${Math.round(x1)}`);

  // 4. mouse click grab from a bin (teleport near, click the bin)
  await page.evaluate(() => window.__LADLE__.teleport(115, 280));
  await page.mouse.click(115, 213);
  await page.waitForTimeout(200);
  check('mouse click grabs bun', await page.evaluate(() => window.__LADLE__.state.hand?.kind === 'bun'));

  // 5. full dish flow with real E presses: bun -> trash, then build Classic Burger
  await page.evaluate(() => window.__LADLE__.teleport(115, 600));
  await page.keyboard.press('KeyE'); // trash the bun
  await page.waitForTimeout(150);
  check('trash clears hand', await page.evaluate(() => window.__LADLE__.state.hand === null));

  // grab patty, cook it
  await page.evaluate(() => window.__LADLE__.teleport(245, 280));
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(150);
  check('grab patty', await page.evaluate(() => window.__LADLE__.state.hand?.kind === 'patty'));
  await page.evaluate(() => window.__LADLE__.teleport(1100, 460));
  await page.keyboard.press('KeyE'); // onto stove
  await page.waitForTimeout(150);
  check('patty on stove cooking', await page.evaluate(() => window.__LADLE__.state.stove[0].stage === 'cooking'));
  await page.waitForTimeout(4500);
  check('patty cooked', await page.evaluate(() => window.__LADLE__.state.stove[0].stage === 'cooked'));
  await page.keyboard.press('KeyE'); // pick up cooked patty
  await page.waitForTimeout(150);
  check('pick up cooked patty', await page.evaluate(() => window.__LADLE__.state.hand?.kind === 'patty' && window.__LADLE__.state.hand.state === 'cooked'));

  // chop lettuce
  await page.evaluate(() => { const L = window.__LADLE__; L.state.hand = null; L.teleport(375, 280); });
  await page.keyboard.press('KeyE'); // grab lettuce
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__LADLE__.teleport(160, 440));
  await page.keyboard.press('KeyE'); // onto board
  await page.waitForTimeout(3000);
  check('lettuce chopped', await page.evaluate(() => window.__LADLE__.state.board.done === true));
  await page.keyboard.press('KeyE'); // pick up
  await page.waitForTimeout(150);
  check('pick up chopped lettuce', await page.evaluate(() => window.__LADLE__.state.hand?.kind === 'lettuce' && window.__LADLE__.state.hand.state === 'chopped'));

  // plate assembly: plate + bun + patty + lettuce = Classic Burger
  await page.evaluate(() => { const L = window.__LADLE__; L.state.hand = null; L.teleport(425, 620); });
  await page.keyboard.press('KeyE'); // grab plate
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__LADLE__.teleport(640, 620));
  await page.keyboard.press('KeyE'); // plate onto assembly
  await page.waitForTimeout(150);
  check('plate on assembly counter', await page.evaluate(() => !!window.__LADLE__.state.assembly.plate));

  // add bun
  await page.evaluate(() => window.__LADLE__.teleport(115, 280));
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__LADLE__.teleport(640, 620));
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  // add cooked patty: grab from stove is complex; use debug to place cooked patty in hand instead
  await page.evaluate(() => { window.__LADLE__.state.hand = { kind: 'patty', state: 'cooked' }; });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  // add chopped lettuce
  await page.evaluate(() => { window.__LADLE__.state.hand = { kind: 'lettuce', state: 'chopped' }; });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  check('plate has 3 items (bun+patty+lettuce)', await page.evaluate(() => window.__LADLE__.state.assembly.plate.contents.length === 3));
  await page.keyboard.press('KeyE'); // pick plate back up
  await page.waitForTimeout(200);
  check('pick up assembled plate', await page.evaluate(() => window.__LADLE__.state.hand?.kind === 'plate'));

  // serve correct dish at window with Space
  const scoreBefore = await page.evaluate(() => window.__LADLE__.state.score);
  await page.evaluate(() => window.__LADLE__.teleport(1115, 620));
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const scoreAfter = await page.evaluate(() => window.__LADLE__.state.score);
  check('serve correct dish raises score', scoreAfter > scoreBefore, `${scoreBefore} -> ${scoreAfter}`);
  check('order consumed', await page.evaluate(() => window.__LADLE__.state.served === 1));

  // wrong dish rejected
  await page.evaluate(() => { const L = window.__LADLE__; L.state.hand = { kind: 'plate', contents: [{ kind: 'tomato', state: 'chopped' }] }; L.teleport(1115, 620); });
  const s2 = await page.evaluate(() => window.__LADLE__.state.score);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const s3 = await page.evaluate(() => window.__LADLE__.state.score);
  check('wrong dish rejected (score unchanged, plate kept)', s3 === s2 && await page.evaluate(() => window.__LADLE__.state.hand?.kind === 'plate'), `score ${s2} -> ${s3}`);

  // order expiry
  const lostBefore = await page.evaluate(() => window.__LADLE__.state.lostOrders);
  await page.evaluate(() => { window.__LADLE__.state.orders[0].timeLeft = 0.3; });
  await page.waitForTimeout(800);
  const lostAfter = await page.evaluate(() => window.__LADLE__.state.lostOrders);
  check('order timer expiry counted', lostAfter === lostBefore + 1, `${lostBefore} -> ${lostAfter}`);

  // pause / resume
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(150);
  check('P pauses', await page.evaluate(() => window.__LADLE__.state.screen === 'paused'));
  const t0 = await page.evaluate(() => window.__LADLE__.state.shiftLeft);
  await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => window.__LADLE__.state.shiftLeft);
  check('clock frozen while paused', Math.abs(t0 - t1) < 0.01, `${t0.toFixed(2)} vs ${t1.toFixed(2)}`);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(150);
  check('P resumes', await page.evaluate(() => window.__LADLE__.state.screen === 'playing'));

  // force win by reaching target through a real serve path: add score then serve
  await page.evaluate(() => { const L = window.__LADLE__; L.addScore(240); L.spawnOrder('salad'); L.state.hand = { kind: 'plate', contents: [{ kind: 'lettuce', state: 'chopped' }, { kind: 'tomato', state: 'chopped' }] }; L.teleport(1115, 620); });
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check('reaching target wins', await page.evaluate(() => window.__LADLE__.state.screen === 'won'));

  // restart with R
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(300);
  check('R restarts after win', await page.evaluate(() => window.__LADLE__.state.screen === 'playing' && window.__LADLE__.state.score === 0));

  // force loss: run the clock out
  await page.evaluate(() => window.__LADLE__.setShiftLeft(0.5));
  await page.waitForTimeout(1200);
  check('clock out below target loses', await page.evaluate(() => window.__LADLE__.state.screen === 'lost'));
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(300);
  check('R restarts after loss', await page.evaluate(() => window.__LADLE__.state.screen === 'playing'));

  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
}

if (MODE === 'shots' || MODE === 'all') {
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await shot('title', '1-title.jpg');
  await page.evaluate(() => window.__LADLE__.stageMidPlay());
  await page.waitForTimeout(400);
  await shot('mid-play', '2-mid-play.jpg');
  await page.evaluate(() => window.__LADLE__.stageServe());
  await page.waitForTimeout(400);
  await shot('serve', '3-ready-to-serve.jpg');
  await page.evaluate(() => window.__LADLE__.stageWin());
  await page.waitForTimeout(400);
  await shot('win', '4-win.jpg');
}

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} checks passed${fails.length ? ', FAILURES: ' + fails.map((f) => f.name).join('; ') : ''}`);
process.exit(fails.length ? 1 : 0);
