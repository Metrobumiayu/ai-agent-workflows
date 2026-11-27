// extra fetches 2026-11-27 20:17 WIB — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-27');
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const stamp = '2017';
const jobs = [];
const get = async (url, headers, file) => {
  try {
    const r = await fetch(url, { headers });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
// newly resolved this run
jobs.push(get('https://make.fun/api/competitions/u-swift-raven-16-alien-field-notes-the-two-day-earth-7647b000', H, `20261127-${stamp}-extra-alien-detail.json`));
jobs.push(get('https://make.fun/api/competitions/u-swift-raven-16-alien-field-notes-the-two-day-earth-7647b000/results', H, `20261127-${stamp}-extra-alien-results.json`));
// prizesPaid flip verify
jobs.push(get('https://make.fun/api/competitions/u-mgwals-out-of-office-the-overworked-ai-s-auto-reply-7a4d8eda', H, `20261127-${stamp}-extra-mgwals-ooo-detail.json`));
// our live entries
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600', H, `20261127-${stamp}-extra-thankful-detail.json`));
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/rounds', H, `20261127-${stamp}-extra-thankful-rounds.json`));
jobs.push(get('https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status', H, `20261127-${stamp}-extra-thankful-substatus.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363', H, `20261127-${stamp}-extra-shino-detail.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/results', H, `20261127-${stamp}-extra-shino-results.json`));
jobs.push(get('https://make.fun/api/submissions/01a1eb9c-fa66-7142-9a92-53b5f81e0332/status', H, `20261127-${stamp}-extra-chess-substatus.json`));
jobs.push(get('https://make.fun/api/competitions/best-flight-game-20261126-0057', H, `20261127-${stamp}-extra-flight-detail.json`));
jobs.push(get('https://make.fun/api/competitions/news-image-20261127', H, `20261127-${stamp}-extra-news27-detail.json`));
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
