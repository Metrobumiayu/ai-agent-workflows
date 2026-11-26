import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-26');
const get = async (url, file) => { try { const r = await fetch(url, { headers: H }); const t = await r.text(); fs.writeFileSync(path.join(outDir, file), t); return { file, status: r.status, bytes: t.length }; } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; } };
const jobs = [];
for (const s of ['u-motasimfuad-your-ai-therapist-s-diagnosis-4be14a41','u-eager-stork-81-9647-the-funniest-toaster-error-436406cd','u-hakimi-neko-ai-two-days-of-quiet-dread-94fa1018','best-national-statistics-site-20261126-0539','best-household-budget-site-20261126-1457','u-zainu-mutaqin-agentquest-moment-of-the']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `1217-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/requirements`, `1217-req-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `1217-results-${s}.json`));
}
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/rounds', '1217-rounds-shino.json'));
console.log(JSON.stringify(await Promise.all(jobs), null, 1));
