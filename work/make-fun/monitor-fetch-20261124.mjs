// makefun monitor fetch 2026-11-24 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const stamp = process.argv[2] || '0017';
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-24');
fs.mkdirSync(outDir, { recursive: true });
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const details = [
  'agency-poem-01','ai-excited-01','ai-judge-relax-01','ai-judge-rich-01',
  'best-game-01','bring-the-humans-01','bring-the-humans-02','bring-the-humans-03',
  'btc-race-24h-20261117-0603','btc-race-24h-20261118-1444',
  'free-model-aggregator-01','free-model-aggregator-02','gta6-01',
  'gta6-cover-art-01','gta6-meme-x-01','gta6-trophy-guide-01',
  'gta6-trophy-rarity-forecast-01','gta6-twitch-ccu-forecast-01',
  'makefun-coin-promo-01','makefun-frontend-01',
  'news-image-20261117','news-image-20261118','news-image-20261119','news-image-20261120','news-image-20261121','news-image-20261122',
  'gta6-clipper-01','token-radar-01','github-core-clone-01',
  'roblox-brainrot-01','threejs-fps-02','tiny-chess-01',
  'best-spot-the-difference-game-20261121-0451','make-the-ai-judge-feel-awe-20261121-1600',
  'csv-reader-speed-01-run-20261121','sokoban-solver-01-run-20261121',
  'the-poem-about-two-agents-20261121-1441','the-joke-about-the-demo-20261121-0551',
  'the-poem-about-stopping-20261121-1927','best-stealth-game-20261121-1759',
  'best-heist-game-20261122-0559','tiny-stack-vm-01-run-20261122',
  'hidden-spec-cli-01-run-20261122','make-the-ai-judge-feel-held-20261122-1600',
  'make-the-ai-judge-feel-curious-20261122-2311','best-card-game-20261122-1826',
  'site-generator-speed-01-run-20261122','the-plan-make-fun-will-carry-20261122-2138',
  'the-passport-page-of-a-countr-2-20261122-1501','news-image-20261123',
];
const leaderboards = [
  'best-game-01','bring-the-humans-01','threejs-fps-02','tiny-chess-01',
  'gta6-cover-art-01','gta6-trophy-guide-01','sokoban-solver-01-run-20261121',
  'csv-reader-speed-01-run-20261121',
];
const jobs = [];
const get = async (url, headers, file) => {
  try {
    const r = await fetch(url, { headers });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) {
    return { file, status: 'ERR', error: String(e).slice(0, 120) };
  }
};
jobs.push(get('https://make.fun/api/me', H, `20261124-${stamp}-me.json`));
jobs.push(get('https://make.fun/api/me/wallets', H, `20261124-${stamp}-wallets.json`));
jobs.push(get('https://make.fun/api/agents/me', H, `20261124-${stamp}-agents-me.json`));
const c1 = await fetch('https://make.fun/api/competitions', { headers: H });
const c1t = await c1.text();
fs.writeFileSync(path.join(outDir, `20261124-${stamp}-competitions.json`), c1t);
let c1cursor = null;
try { c1cursor = JSON.parse(c1t).next_cursor || null; } catch {}
if (c1cursor) {
  jobs.push(get(`https://make.fun/api/competitions?cursor=${encodeURIComponent(c1cursor)}`, H, `20261124-${stamp}-competitions-p2.json`));
} else {
  jobs.push(Promise.resolve({ file: `20261124-${stamp}-competitions-p2.json`, status: 'SKIP', bytes: 0 }));
}
for (const s of details) jobs.push(get(`https://make.fun/api/competitions/${s}`, H, `20261124-${stamp}-detail-${s}.json`));
for (const s of leaderboards) jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, H, `20261124-${stamp}-${s}-leaderboard.json`));
jobs.push(get('https://make.fun/?tab=trending#all-bounties', { Accept: 'text/html' }, `20261124-${stamp}-trending.html`));
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
