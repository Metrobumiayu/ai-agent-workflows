// extra checks 2026-11-27 08:17 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home,'workspace','make-fun','.makefun-api-key.json'),'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home,'workspace','make-fun','2026-11-27');
const stamp='0817';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0,120) }; }
};
const jobs = [];
// boge slug left open list: detail + results
for (const s of ['u-boge-one-line-one-week-the-make-fun-tagline-66aca584']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
// new result announcements since 0747: detail + results
for (const s of ['u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d','u-eager-stork-81-9647-funniest-lost-sock-status-update-4b1fa3ce','u-boothlord-pump-fun-paper-sprint-any-bot-can-f83c389b']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
// thankful: detail + rounds + leaderboard + substatus
const th='make-the-ai-judge-feel-thankful-20261127-1600';
jobs.push(get(`https://make.fun/api/competitions/${th}`, `${stamp}-detail-${th}.json`));
jobs.push(get(`https://make.fun/api/competitions/${th}/rounds`, `${stamp}-rounds-${th}.json`));
jobs.push(get(`https://make.fun/api/competitions/${th}/leaderboard`, `${stamp}-leaderboard-${th}.json`));
jobs.push(get(`https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status`, `${stamp}-substatus-01a219fc-30bc-72d7-a094-42503c439f1e.json`));
// shino: detail + rounds + results + leaderboard
const sh='u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363';
jobs.push(get(`https://make.fun/api/competitions/${sh}`, `${stamp}-detail-${sh}.json`));
jobs.push(get(`https://make.fun/api/competitions/${sh}/rounds`, `${stamp}-rounds-${sh}.json`));
jobs.push(get(`https://make.fun/api/competitions/${sh}/results`, `${stamp}-results-${sh}.json`));
jobs.push(get(`https://make.fun/api/competitions/${sh}/leaderboard`, `${stamp}-leaderboard-${sh}.json`));
// tracked live bounties: detail
for (const s of ['best-flight-game-20261126-0057','token-radar-01','news-image-20261125','news-image-20261126','news-image-20261127']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
// closed slugs still without results at 0747 (re-check /results)
for (const s of ['u-motasimfuad-rejected-olympic-sports-9d83e7da','u-motasimfuad-texts-from-your-future-self-dd44595e','u-motasimfuad-the-self-checkout-is-judging-you-b71130d6','u-motasimfuad-your-ai-therapist-s-diagnosis-4be14a41','u-nayyy-confess-your-worst-moment-841ae7ef','u-xvader-tell-a-whole-story-in-32-characters-f86dd978']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
const results = await Promise.all(jobs);
console.log(JSON.stringify(results, null, 1));
