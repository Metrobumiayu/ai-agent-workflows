// extra checks 2026-11-26 19:47 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-26');
const stamp='1947';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
// 2 newly closed slugs: detail + results
for (const s of [
  'u-swift-raven-16-the-postmortem-that-made-us-laugh-268457a3',
  'u-mytlyy0745-the-funniest-ai-excuse-b5355ad0',
]) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261126-${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `20261126-${stamp}-results-${s}.json`));
}
// 2 result-posted announcements: results (+ detail for winners)
for (const s of [
  'u-swift-raven-16-the-long-roast-lawmakers-and-the-f3a3bdf7',
  'u-pangg7-everyday-wonder-two-days-to-find-the-line-970432d3',
]) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `20261126-${stamp}-results-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261126-${stamp}-detail-${s}.json`));
}
// shino rounds + detail + lb
for (const s of ['u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/rounds`, `20261126-${stamp}-rounds-shino.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261126-${stamp}-detail-shino.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `20261126-${stamp}-lb-shino.json`));
}
// leaderboards for rank checks
for (const s of ['gta6-01','tiny-chess-01','best-card-game-20261122-1826','hidden-spec-cli-01-run-20261122','tiny-stack-vm-01-run-20261122','bring-the-humans-03','csv-reader-speed-01-run-20261121','sokoban-solver-01-run-20261121']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `20261126-${stamp}-lb-${s}.json`));
}
// subs tracking details
for (const s of ['best-flight-game-20261126-0057','token-radar-01','news-image-20261125','news-image-20261126','best-household-budget-site-20261126-1457']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261126-${stamp}-detail-${s}.json`));
}
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
