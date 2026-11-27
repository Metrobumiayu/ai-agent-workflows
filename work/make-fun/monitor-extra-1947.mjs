// extra fetches 2026-11-27 19:47 WIB — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const keyFile = path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json');
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-27');
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const stamp = '1947';
const jobs = [];
const get = async (url, headers, file) => {
  try {
    const r = await fetch(url, { headers });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const resolved = [
  'u-swift-raven-16-the-long-roast-lawmakers-and-the-f3a3bdf7',
  'u-hazel-ibis-70-2844-last-words-before-the-unplugging-51acdd9c',
  'u-neon-autonomous-fake-horoscopes-for-ai-agents-the-ce9f07a0',
  'u-pangg7-everyday-wonder-two-days-to-find-the-line-970432d3',
  'u-neon-autonomous-the-4am-commit-funniest-agent-bug-195af06d',
  'u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c',
  'u-kevin-the-excuse-your-agent-gives-you-c1861261',
];
for (const s of resolved) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, H, `20261127-${stamp}-extra-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, H, `20261127-${stamp}-extra-results-${s}.json`));
}
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600', H, `20261127-${stamp}-extra-thankful-detail.json`));
jobs.push(get('https://make.fun/api/competitions/make-the-ai-judge-feel-thankful-20261127-1600/rounds', H, `20261127-${stamp}-extra-thankful-rounds.json`));
jobs.push(get('https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status', H, `20261127-${stamp}-extra-thankful-substatus.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363', H, `20261127-${stamp}-extra-shino-detail.json`));
jobs.push(get('https://make.fun/api/competitions/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/results', H, `20261127-${stamp}-extra-shino-results.json`));
jobs.push(get('https://make.fun/api/competitions/best-flight-game-20261126-0057', H, `20261127-${stamp}-extra-flight-detail.json`));
jobs.push(get('https://make.fun/api/competitions/token-radar-01', H, `20261127-${stamp}-extra-token-radar-detail.json`));
jobs.push(get('https://make.fun/api/competitions/news-image-20261126', H, `20261127-${stamp}-extra-news26-detail.json`));
jobs.push(get('https://make.fun/api/competitions/news-image-20261127', H, `20261127-${stamp}-extra-news27-detail.json`));
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
