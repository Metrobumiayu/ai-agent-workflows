// extra fetch 2026-11-27 0947 run — public endpoints
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const outDir = path.join(os.homedir(), 'workspace', 'make-fun', '2026-11-27');
const stamp = '0947';
const get = async (url, file) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      const t = await r.text();
      fs.writeFileSync(path.join(outDir, file), t);
      console.log(file, r.status, t.length);
      return;
    } catch (e) {
      console.log(file, 'ERR attempt', attempt, String(e).slice(0, 100));
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};
const jobs = [];
const detail = s => jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261127-${stamp}-detail-${s}.json`));
const results = s => jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `20261127-${stamp}-results-${s}.json`));
// newly resolved slug
detail('u-4z4ghtbwm1fn7mibrqum4bxgfghhgqzriyhd8v3-one-line-0be61e5a');
results('u-4z4ghtbwm1fn7mibrqum4bxgfghhgqzriyhd8v3-one-line-0be61e5a');
// prizesPaid change
detail('u-tidy-owl-94-9499-winner-takes-all-5-pump-fun-b82c82d3');
// still-pending results slugs
results('u-motasimfuad-rejected-olympic-sports-9d83e7da');
results('u-self-checkout-is-judging-you');
// thankful (live entry, round-1 cutoff 10:41 WIB)
detail('make-the-ai-judge-feel-thankful-20261127-1600');
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/rounds', `20261127-${stamp}-rounds-thankful.json`));
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/leaderboard', `20261127-${stamp}-leaderboard-thankful.json`));
jobs.push(get('https://make.fun/api/submissions/01a219fc/status', `20261127-${stamp}-substatus-thankful.json`));
// shino
detail('u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363');
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/rounds', `20261127-${stamp}-rounds-shino.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/results', `20261127-${stamp}-results-shino.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/leaderboard', `20261127-${stamp}-leaderboard-shino.json`));
for (const s of ['best-flight-game-20261126-0057','token-radar-01','news-image-20261127','news-image-20261126','best-household-budget-site-20261126-1457','best-national-statistics-site-20261126-0539']) detail(s);
await Promise.all(jobs);
console.log('done');
