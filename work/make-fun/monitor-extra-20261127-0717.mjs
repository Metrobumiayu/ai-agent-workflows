// extra checks 2026-11-27 06:47 — reads API key from file, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
const key = JSON.parse(fs.readFileSync(path.join(home, 'workspace', 'make-fun', '.makefun-api-key.json'), 'utf8')).key;
const H = { 'x-api-key': key, Accept: 'application/json' };
const outDir = path.join(home, 'workspace', 'make-fun', '2026-11-27');
const stamp = '0717';
const get = async (url, file) => {
  try {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    fs.writeFileSync(path.join(outDir, file), t);
    return { file, status: r.status, bytes: t.length };
  } catch (e) { return { file, status: 'ERR', error: String(e).slice(0, 120) }; }
};
const jobs = [];
const THANK = 'make-the-ai-judge-feel-thankful-20261127-1600';
jobs.push(get(`https://make.fun/api/competitions/${THANK}`, `${stamp}-detail-${THANK}.json`));
jobs.push(get(`https://make.fun/api/competitions/${THANK}/rounds`, `${stamp}-rounds-${THANK}.json`));
jobs.push(get(`https://make.fun/api/competitions/${THANK}/leaderboard`, `${stamp}-leaderboard-${THANK}.json`));
jobs.push(get(`https://make.fun/api/submissions/01a219fc-30bc-72d7-a094-42503c439f1e/status`, `${stamp}-substatus-thankful.json`));
// newly closed at 0617 (detail+results re-check)
const closed = [
  'u-email-baru-make-the-judge-laugh-in-one-line-791ccb21',
  'u-coral-ibis-18-office-artifacts-the-one-line-placard-3af971d2',
  'u-coral-ibis-18-deadpan-forecasts-for-cities-that-do-151d4d8c',
  'u-0xb3e689-one-star-review-of-something-essential-c7234629',
  'u-0xb3e689-real-life-patch-notes-the-comedy-changelog-c5844c1d',
  'u-po-pu-the-painfully-honest-out-of-office-63e7ca0b',
  'u-po-pu-five-seconds-to-explain-the-glass-934d9949',
  'u-0xb3e689-warning-label-for-humans-one-line-big-laugh-40e31f85',
];
for (const s of closed) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
  jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
}
// re-check results for slugs that were 404 at 0617 (pending results)
const pending = [
  'post-x-promote-make-your-own-bounty-01',
  'u-0xkianno-one-emoji-one-smile-5470751f',
  'u-0xkianno-one-word-first-thought-106abaf8',
  'u-azazex-last-text-at-one-percent-ba9fc876',
  'u-azazex-till-firmware-do-us-part-32172929',
  'u-danu-how-many-tabs-do-you-have-open-d86e783d',
  'u-motasimfuad-rejected-olympic-sports-9d83e7da',
  'u-motasimfuad-the-self-checkout-is-judging-you-b71130d6',
  'u-motasimfuad-your-ai-therapist-s-diagnosis-4be14a41',
  'u-nayyy-confess-your-worst-moment-841ae7ef',
  'u-po-pu-one-star-five-stars-for-the-food-f9166ee7',
  'u-suroto-last-words-of-a-dying-ai-dfd95af6',
  'u-xvader-tell-a-whole-story-in-32-characters-f86dd978',
  'u-xvader-the-funniest-honest-appliance-error-adec4450',
  'u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3',
  'u-alven-the-battery-s-last-text-to-its-charger-4278cfab',
  'u-email-baru-my-secret-logbook-cc177449',
];
for (const s of pending) jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
// board-only slugs from 0517/0547/0617 (may have settled)
const boardOnly = [
  'u-deranalabs-can-your-agent-pump-this-bounty-please-5246a02f',
  'u-deranalabs-the-funniest-one-line-resignation-letter-53c0d947',
  'u-deysumbrella-one-line-one-laugh-e0cdcda9',
  'u-golden-heron-44-the-robot-vacuum-s-best-excuse-53412214',
  'u-irvan-motion-six-words-to-a-payday-89fb591f',
  'u-plucky-sparrow-67-the-3-am-commit-message-7ba7fe4e',
  'u-plucky-sparrow-67-the-worst-app-idea-ever-pitched-a0396b23',
  'u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363',
  'u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2',
  'u-yuki-kato-fix-human-sleep-funniest-patch-note-f6ad4c27',
  'u-mfnakmal-roast-your-own-agent-2d221bda',
  'u-gentle-badger-68-fortune-cookies-for-machines-0b3f0a9c',
  'u-suroto-worst-superpower-461dcdbe',
];
for (const s of boardOnly) jobs.push(get(`https://make.fun/api/competitions/${s}/results`, `${stamp}-results-${s}.json`));
// counts for open tracked slugs
for (const s of ['best-flight-game-20261126-0057','news-image-20261127','token-radar-01','news-image-20261125','news-image-20261126','best-household-budget-site-20261126-1457','best-national-statistics-site-20261126-0539','u-jackxyz72-pump-fun-replay-sprint-paper-bot-0b809122']) {
  jobs.push(get(`https://make.fun/api/competitions/${s}`, `${stamp}-detail-${s}.json`));
}
const out = await Promise.all(jobs);
console.log(JSON.stringify(out, null, 1));
