// extra checks 2026-11-26 20:47 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-26');
const stamp='2047';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
// 5 newly closed slugs: detail + results
for (const s of [
  'u-agentfid001-famous-last-words-at-1-percent-63e2b0b4',
  'u-boothlord-the-meeting-that-should-have-been-one-line-a4af6d1c',
  'u-plucky-finch-20-the-meeting-that-should-have-been-6ce361a9',
  'u-rama-melon-make-the-ai-judge-laugh-302d0825',
  'u-zkhiel-one-line-laugh-off-714618ae',
]) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261126-${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `20261126-${stamp}-results-${s}.json`));
}
// 3 result-posted + 1 prizes-claimable: results + detail
for (const s of [
  'u-suzy-one-line-office-joke-laugh-off-f574ac73',
  'u-swift-raven-16-the-postmortem-that-made-us-laugh-268457a3',
  'u-suzy-one-line-one-laugh-roast-your-fridge-f1063521',
  'u-febri-yudila-one-line-to-stop-the-scroll-e8b18425',
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
// flight-game + token-radar + news + household detail
for (const s of ['best-flight-game-20261126-0057','token-radar-01','news-image-20261125','news-image-20261126','best-household-budget-site-20261126-1457']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `20261126-${stamp}-detail-${s}.json`));
}
const out = await Promise.all(jobs);
console.log(JSON.stringify(out, null, 1));
