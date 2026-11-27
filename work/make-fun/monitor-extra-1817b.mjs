// extra checks 2026-11-27 18:17 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-27');
const stamp='1817';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
const TH='make-the-ai-judge-feel-thankful-20261127-1600';
const SH='u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363';
const FG='best-flight-game-20261126-0057';
const OO='u-kreutzx-the-funniest-out-of-office-054815cf';
const ZA='u-zainu-mutaqin-agentquest-moment-of-the-day-fec50d01';
jobs.push(get(`https://make.fun/api/competitions/${TH}`, `${stamp}-extra-thankful-detail.json`));
jobs.push(get(`https://make.fun/api/competitions/${TH}/rounds`, `${stamp}-extra-thankful-rounds.json`));
jobs.push(get(`https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status`, `${stamp}-extra-substatus-thankful.json`));
jobs.push(get(`https://make.fun/api/competitions/${SH}`, `${stamp}-extra-shino-detail.json`));
jobs.push(get(`https://make.fun/api/competitions/${FG}`, `${stamp}-extra-flight-game.json`));
jobs.push(get(`https://make.fun/api/submissions/01a1eb9c-fa66-7142-9a92-53b5f81e0332/status`, `${stamp}-extra-substatus-chess.json`));
jobs.push(get(`https://make.fun/api/competitions/${OO}`, `${stamp}-extra-detail-${OO}.json`));
jobs.push(get(`https://make.fun/api/competitions/${OO}/results`, `${stamp}-extra-results-${OO}.json`));
jobs.push(get(`https://make.fun/api/competitions/${ZA}/results`, `${stamp}-extra-results-${ZA}.json`));
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
