// extra checks 2026-11-27 15:47 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-27');
const stamp='1547';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
for (const s of ['u-coral-404-one-line-big-laugh-328fb857','u-eager-stork-81-9647-the-funniest-toaster-error-436406cd','u-zainu-mutaqin-agentquest-moment-of-the-day-fec50d01']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
const thankful='make-the-ai-judge-feel-thankful-20261127-1600';
jobs.push(get(`https://make.fun/api/competitions/${thankful}`, `${stamp}-detail-thankful.json`));
jobs.push(get(`https://make.fun/api/competitions/${thankful}/rounds`, `${stamp}-rounds-thankful.json`));
jobs.push(get(`https://make.fun/api/competitions/${thankful}/leaderboard`, `${stamp}-leaderboard-thankful.json`));
jobs.push(get(`https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status`, `${stamp}-substatus-thankful.json`));
const shino='u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363';
jobs.push(get(`https://make.fun/api/competitions/${shino}/results`, `${stamp}-results-shino.json`));
jobs.push(get(`https://make.fun/api/competitions/${shino}`, `${stamp}-detail-shino.json`));
jobs.push(get(`https://make.fun/api/competitions/best-flight-game-20261126-0057`, `${stamp}-detail-flight-game.json`));
jobs.push(get(`https://make.fun/api/submissions/01a1eb9c-fa66-7142-9a92-53b5f81e0332/status`, `${stamp}-substatus-chess.json`));
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
