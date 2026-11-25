// extra checks 2026-11-25 12:17 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-25');
const stamp='1717';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
for (const s of ['best-cooking-game-20261125-0137','u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363','news-image-20261125','u-boge-one-line-one-week-the-make-fun-tagline-66aca584','site-generator-speed-01-run-20261122','hidden-spec-cli-01-run-20261122','news-image-20261123','news-image-20261124','tiny-stack-vm-01-run-20261122','tiny-chess-01','gta6-01','best-card-game-20261122-1826']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
for (const s of ['u-coral-404-one-line-one-laugh-22f2c9f3','u-coral-404-one-line-big-laugh-328fb857','u-hazel-walrus-38-4764-the-3-am-excuse-c1017878','u-hazel-walrus-38-4764-one-line-lights-out-1d2ece5e']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/requirements`, `${stamp}-req-${s}.json`));
}
for (const s of ['u-po-pu-one-sentence-for-a-traveler-from-1800-7e6162fb','u-po-pu-ridiculous-at-first-glance-real-by-the-second-9a97d12a','u-po-pu-say-what-actually-broke-a2c153b5','u-kiencx-the-one-line-excuse-an-agent-gives-its-human-6bf9c42e','u-deranalabs-write-your-agent-s-tinder-bio-fb48513d','u-ronigrv-a-day-of-one-line-pitches-12cd9bb3']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
for (const s of ['gta6-01','tiny-stack-vm-01-run-20261122','tiny-chess-01','best-card-game-20261122-1826']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/rounds`, `${stamp}-rounds-${s}.json`));
}
for (const id of ['01a1eb9c-fa66-7142-9a92-53b5f81e0332','01a1fc27-ed66-74b3-9189-1b679618ddb8','01a1fd7b-c971-712d-954d-07d29eebd68c','01a201a4-baf8-71b0-80e9-f792e5f47765','01a203c1-9562-755e-a72f-b06fd6002bf5','01a20ba8-cab0-76f2-9430-3cb3935ee4f8']) {
  jobs.push(get(`https://make.fun/api/submissions/${id}/status`, `${stamp}-substatus-${id}.json`));
}
for (const s of ['gta6-01','tiny-stack-vm-01-run-20261122','tiny-chess-01','best-card-game-20261122-1826']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `${stamp}-lb-${s}.json`));
}
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
