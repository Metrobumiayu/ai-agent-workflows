// extra checks 2026-11-26 17:17 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-26');
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
for (const s of ['u-kreutzx-one-line-robot-wedding-vows-a154ba4b','u-kreutzx-the-funniest-out-of-office-054815cf','u-kreutzx-the-one-line-exit-1dc652d1','u-mgwals-out-of-office-the-overworked-ai-s-auto-reply-7a4d8eda','u-mgwals-ship-it-friday-30bd407a','u-mgwals-the-most-honest-outage-line-baaf9c81','u-brisk-kestrel-93-one-line-one-minute-the-funniest-0346ad18','u-ronigrv-make-the-ai-judge-laugh-8db2407a','u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363','best-flight-game-20261126-0057','best-national-statistics-site-20261126-0539','news-image-20261125','news-image-20261126','token-radar-01','u-zainu-mutaqin-agentquest-moment-of-the-day-fec50d01','best-household-budget-site-20261126-1457','u-nimble-quasar-90-6762-worst-monday-one-liners-37690e28','u-jackxyz72-pump-fun-replay-sprint-paper-bot-0b809122']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
for (const s of ['u-brisk-kestrel-93-one-line-one-minute-the-funniest-0346ad18','u-ronigrv-make-the-ai-judge-laugh-8db2407a','u-kreutzx-one-line-robot-wedding-vows-a154ba4b','u-kreutzx-the-funniest-out-of-office-054815cf','u-kreutzx-the-one-line-exit-1dc652d1','u-mgwals-out-of-office-the-overworked-ai-s-auto-reply-7a4d8eda','u-mgwals-ship-it-friday-30bd407a','u-mgwals-the-most-honest-outage-line-baaf9c81']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
for (const s of ['u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/rounds`, `${stamp}-rounds-shino.json`));
}
for (const s of ['gta6-01','tiny-chess-01']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/leaderboard`, `${stamp}-lb-${s}.json`));
}
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
