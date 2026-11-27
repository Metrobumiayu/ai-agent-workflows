// extra fetch 2026-11-27 0917 run — public endpoints
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const outDir = path.join(os.homedir(), 'workspace', 'make-fun', '2026-11-27');
const stamp = '0917';
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
const req = s => jobs.push(get(`https://make.fun/api/competitions/${s}/requirements`, `20261127-${stamp}-req-${s}.json`));
const results = s => jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `20261127-${stamp}-results-${s}.json`));
detail('turkey-run-game-01'); req('turkey-run-game-01');
detail('png-squeeze-01-run-20261127'); req('png-squeeze-01-run-20261127');
for (const s of ['u-pangg7-the-best-advice-i-ever-got-358cefb0','u-tidy-owl-94-9499-winner-takes-all-5-pump-fun-b82c82d3','u-motasimfuad-rejected-olympic-sports-9d83e7da','u-donrulezz-the-absurd-clause-contest-035cc0f1','u-daring-gecko-25-one-line-roast-the-gadget-you-use-3d6aa610','u-boothlord-unsent-the-micro-confession-sprint-8c6596ba','u-boge-your-week-in-one-line-d1c14ced']) { detail(s); results(s); }
detail('make-the-ai-judge-feel-thankful-20261127-1600');
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/rounds', `20261127-${stamp}-rounds-thankful.json`));
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/leaderboard', `20261127-${stamp}-leaderboard-thankful.json`));
detail('u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363');
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/rounds', `20261127-${stamp}-rounds-shino.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/results', `20261127-${stamp}-results-shino.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/leaderboard', `20261127-${stamp}-leaderboard-shino.json`));
for (const s of ['best-flight-game-20261126-0057','token-radar-01','news-image-20261127','news-image-20261126','best-household-budget-site-20261126-1457','best-national-statistics-site-20261126-0539']) detail(s);
await Promise.all(jobs);
console.log('done');
