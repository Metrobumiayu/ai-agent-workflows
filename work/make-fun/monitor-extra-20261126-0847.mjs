// extra checks 2026-11-26 07:17 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-26');
const stamp='0847';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
// angry-judge result posted (new announcement 19:31:35Z)
for (const s of ['u-riidzhsn-angry-judge-the-short-rant-contest-b9f46046']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
// tidy-owl pot changed 20.05 -> 19.62 in agents-me open list
for (const s of ['u-tidy-owl-94-9499-winner-takes-all-5-pump-fun-b82c82d3']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
// shino rounds + leaderboard + detail
for (const s of ['u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/rounds`, `${stamp}-rounds-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `${stamp}-lb-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
// substatus for live entries
for (const id of ['01a1eb9c-fa66-7142-9a92-53b5f81e0332','01a211f6-c0c7-71eb-a714-98c229815e49','01a20ba8-cab0-76f2-9430-3cb3935ee4f8','01a201a4-baf8-71b0-80e9-f792e5f47765','01a203c1-9562-755e-a72f-b06fd6002bf5','01a204b1-68ce-70f6-8c52-1e6b71e90d0f','01a1fd7b-c971-712d-954d-07d29eebd68c','01a1fc27-ed66-74b3-9189-1b679618ddb8']) {
  jobs.push(get(`https://make.fun/api/submissions/${id}/status`, `${stamp}-substatus-${id}.json`));
}
// leaderboards for rank checks not in main fetch
for (const s of ['u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363','best-card-game-20261122-1826','hidden-spec-cli-01-run-20261122','tiny-stack-vm-01-run-20261122','gta6-01','bring-the-humans-03']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `${stamp}-lb-${s}.json`));
}
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
