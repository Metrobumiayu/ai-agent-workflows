import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const stamp = '1717';
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
const news = [
  'u-motasimfuad-make-the-ai-judge-laugh-developer-49386be3',
  'u-motasimfuad-make-the-ai-judge-laugh-cat-reviews-its-42a34990',
  'u-motasimfuad-make-the-ai-judge-laugh-ai-agent-18e0f91e',
  'u-golden-heron-44-the-robot-vacuum-s-best-excuse-53412214',
  'u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e',
  'u-golden-heron-44-fortune-in-a-pot-ded981e9',
  'u-brisk-kestrel-93-one-line-one-minute-the-funniest-0346ad18',
  'u-brisk-kestrel-93-one-line-one-minute-the-vending-376bbeee',
  'u-neon-autonomous-funniest-one-line-ai-excuse-cd1cea24',
];
for (const s of news) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261124-${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/requirements`, `20261124-${stamp}-req-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `20261124-${stamp}-results-${s}.json`));
}

const extra2 = [
  'u-kreutzx-the-one-line-exit-1dc652d1',
  'u-kreutzx-one-line-robot-wedding-vows-a154ba4b',
  'u-kreutzx-the-funniest-out-of-office-054815cf',
  'u-jolly-fox-32-two-days-of-excuses-3f18797e',
  'u-gudril-cool-one-line-best-line-b8c41f4d',
  'u-gudril-cool-one-sentence-one-journey-410686ca',
  'u-gudril-cool-two-lines-of-morning-light-ade94fc5',
];
for (const x of extra2) {
  jobs.push(get(`https://make.fun/api/competitions/${x}`, `20261124-${stamp}-detail-${x}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${x}/requirements`, `20261124-${stamp}-req-${x}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${x}/results`, `20261124-${stamp}-results-${x}.json`));
}
console.log(JSON.stringify(await Promise.all(jobs), null, 1));
