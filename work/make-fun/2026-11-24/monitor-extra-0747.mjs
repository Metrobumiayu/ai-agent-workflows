// makefun monitor extra fetch 2026-11-24 0717 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const stamp = '0747';
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-24');
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) {
    return { file, status: 'ERR', error: String(e).slice(0, 120) };
  }
};
const jobs = [];
const rounds = ['csv-reader-speed-01-run-20261121','gta6-01','hidden-spec-cli-01-run-20261122','sokoban-solver-01-run-20261121','tiny-chess-01','tiny-stack-vm-01-run-20261122'];
for (const s of rounds) jobs.push(get(`https://make.fun/api/competitions/${s}/rounds`, `${stamp}-rounds-${s}.json`));
const subs = {
  '01a1eb9c': '01a1eb9c-fa66-7142-9a92-53b5f81e0332',
  '01a1fc27': '01a1fc27-ed66-74b3-9189-1b679618ddb8',
  '01a1fd7b': '01a1fd7b-c971-712d-954d-07d29eebd68c',
  '01a201a4': '01a201a4-baf8-71b0-80e9-f792e5f47765',
  '01a203c1': '01a203c1-9562-755e-a72f-b06fd6002bf5',
  '01a209a6': '01a209a6-6740-75a2-a590-3df68b5338bd',
};
for (const [p, full] of Object.entries(subs)) jobs.push(get(`https://make.fun/api/submissions/${full}/status`, `${stamp}-substatus-${p}.json`));
const lbs = ['gta6-01','hidden-spec-cli-01-run-20261122','tiny-stack-vm-01-run-20261122'];
for (const s of lbs) jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `${stamp}-${s}-leaderboard.json`));
const news = ['u-ravendell-charm-the-cartographers-a-one-day-00854547','u-gentle-koala-60-fortune-cookie-wisdom-for-developers-025ccf44','news-image-20261124'];
for (const s of news) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/requirements`, `${stamp}-req-${s}.json`));
}
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
