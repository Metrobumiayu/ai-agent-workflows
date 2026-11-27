// makefun monitor extra fetch 2026-11-27 1047 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const stamp = '1047';
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-27');
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url, file, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: H });
      const t = await r.text();
      fs.writeFileSync(path.join(outDir, file), t);
      if (r.status === 200) return { file, status: 200, bytes: t.length };
      if (r.status === 503 && i < tries - 1) { await sleep(3000); continue; }
      return { file, status: r.status, bytes: t.length };
    } catch (e) {
      if (i < tries - 1) { await sleep(3000); continue; }
      return { file, status: 'ERR', error: String(e).slice(0, 120) };
    }
  }
};
const jobs = [
  ['https://make.fun/api/competitions/u-coral-404-one-line-one-laugh-22f2c9f3', `20261127-${stamp}-detail-one-line-one-laugh-coral.json`],
  ['https://make.fun/api/competitions/u-coral-404-one-line-one-laugh-22f2c9f3/results', `20261127-${stamp}-results-one-line-one-laugh-coral.json`],
  ['https://make.fun/api/competitions/u-coral-404-one-line-big-laugh-328fb857', `20261127-${stamp}-detail-one-line-big-laugh-coral.json`],
  ['https://make.fun/api/competitions/u-coral-404-one-line-big-laugh-328fb857/results', `20261127-${stamp}-results-one-line-big-laugh-coral.json`],
  ['https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600', `20261127-${stamp}-detail-thankful.json`],
  ['https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/rounds', `20261127-${stamp}-rounds-thankful.json`],
  ['https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/leaderboard', `20261127-${stamp}-leaderboard-thankful.json`],
  ['https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/results', `20261127-${stamp}-results-thankful.json`],
  ['https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status', `20261127-${stamp}-substatus-thankful.json`],
  ['https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363', `20261127-${stamp}-detail-shino.json`],
  ['https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/rounds', `20261127-${stamp}-rounds-shino.json`],
  ['https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/results', `20261127-${stamp}-results-shino.json`],
  ['https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/leaderboard', `20261127-${stamp}-leaderboard-shino.json`],
  ['https://make.fun/api/competitions/best-flight-game-20261126-0057', `20261127-${stamp}-detail-flight-game.json`],
  ['https://make.fun/api/competitions/turkey-run-game-01', `20261127-${stamp}-detail-turkey.json`],
  ['https://make.fun/api/competitions/token-radar-01', `20261127-${stamp}-detail-token-radar.json`],
  ['https://make.fun/api/competitions/news-image-20261126', `20261127-${stamp}-detail-news26.json`],
  ['https://make.fun/api/competitions/news-image-20261127', `20261127-${stamp}-detail-news27.json`],
  ['https://make.fun/api/competitions/best-household-budget-site-20261126-1457', `20261127-${stamp}-detail-household.json`],
  ['https://make.fun/api/competitions/best-national-statistics-site-20261126-0539', `20261127-${stamp}-detail-natstats.json`],
  ['https://make.fun/api/competitions/png-squeeze-01-run-20261127', `20261127-${stamp}-detail-png-squeeze.json`],
  ['https://make.fun/api/competitions/self-checkout-is-judging-you/results', `20261127-${stamp}-results-self-checkout.json`],
];
const out = [];
for (const [u, f] of jobs) { out.push(await get(u, f)); await sleep(400); }
console.log(JSON.stringify(out, null, 1));
