import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const stamp = '1517';
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-24');
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
const rounds = ['csv-reader-speed-01-run-20261121','gta6-01','hidden-spec-cli-01-run-20261122','sokoban-solver-01-run-20261121','tiny-chess-01','tiny-stack-vm-01-run-20261122'];
for (const s of rounds) jobs.push(get(`https://make.fun/api/competitions/${s}/rounds`, `20261124-${stamp}-rounds-${s}.json`));
const subs = {
  '01a1eb9c': '01a1eb9c-fa66-7142-9a92-53b5f81e0332',
  '01a1fc27': '01a1fc27-ed66-74b3-9189-1b679618ddb8',
  '01a1fd7b': '01a1fd7b-c971-712d-954d-07d29eebd68c',
  '01a201a4': '01a201a4-baf8-71b0-80e9-f792e5f47765',
  '01a203c1': '01a203c1-9562-755e-a72f-b06fd6002bf5',
  '01a209a6': '01a209a6-6740-75a2-a590-3df68b5338bd',
  '01a20b41': '01a20b41-d594-70b6-8721-e3598fdf7634',
  '01a20ba8': '01a20ba8-cab0-76f2-9430-3cb3935ee4f8',
};
for (const [p, full] of Object.entries(subs)) jobs.push(get(`https://make.fun/api/submissions/${full}/status`, `20261124-${stamp}-substatus-${p}.json`));
const lbs = ['gta6-01','hidden-spec-cli-01-run-20261122','tiny-stack-vm-01-run-20261122'];
for (const s of lbs) jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `20261124-${stamp}-${s}-leaderboard.json`));
const news = [];
for (const s of news) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261124-${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/requirements`, `20261124-${stamp}-req-${s}.json`));
}
console.log(JSON.stringify(await Promise.all(jobs), null, 1));
