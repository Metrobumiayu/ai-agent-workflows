// tight compare 0817 vs 0747 — key fields only
import fs from 'node:fs';
const base = '/home/hatch/workspace/make-fun/2026-11-26/';
const out = (s) => process.stdout.write(s + '\n');
const read = (f) => { try { return fs.readFileSync(base + f, 'utf8'); } catch { return null; } };
const J = (t) => { try { return JSON.parse(t); } catch { return null; } };

for (const f of ['me.json', 'wallets.json', 'agents-me.json']) {
  const a = read(`20261126-0817-${f}`), b = read(`20261126-0747-${f}`);
  out(f + ': ' + (a === b ? 'IDENTICAL' : 'DIFFERS'));
}

const listMap = (stamp) => {
  const m = new Map();
  for (const p of ['', '-p2', '-p3', '-p4', '-p5', '-p6']) {
    const j = J(read(`20261126-${stamp}-competitions${p}.json`));
    if (!j) continue;
    for (const c of (j.competitions || j.items || j.data || [])) m.set(c.slug || c.id, c);
  }
  return m;
};
const m17 = listMap('0817'), m47 = listMap('0747');
out('slugs 0747=' + m47.size + ' 0817=' + m17.size);
for (const s of [...m17.keys()].filter(x => !m47.has(x))) out('NEW SLUG: ' + s);
for (const s of [...m47.keys()].filter(x => !m17.has(x))) out('GONE SLUG: ' + s);
for (const [slug, c] of m17) {
  const o = m47.get(slug);
  if (!o) continue;
  const d = [];
  for (const k of ['status', 'winner', 'prizesPaid', 'acceptingSubmissions', 'resolvedAt']) {
    if (JSON.stringify(c[k]) !== JSON.stringify(o[k])) d.push(k + ': ' + JSON.stringify(o[k]) + ' -> ' + JSON.stringify(c[k]));
  }
  const sc = c.submissionCount ?? c.submissions?.length, so = o.submissionCount ?? o.submissions?.length;
  if (sc !== so) d.push('subs: ' + so + ' -> ' + sc);
  if (d.length) out('LIST ' + slug + ' :: ' + d.join(' | '));
}

// detail key fields
const keyFields = (j) => {
  if (!j) return null;
  const c = j.competition || j;
  return {
    status: c.status, winner: c.winner || c.winner_handle || null,
    prizesPaid: c.prizesPaid, accepting: c.acceptingSubmissions,
    subs: c.submissionCount, payouts: (c.payouts || []).length,
    resolvedAt: c.resolvedAt, phase: c.phase?.status || c.phase,
  };
};
for (const f of fs.readdirSync(base).filter(x => x.startsWith('20261126-0817-detail-'))) {
  const old = f.replace('0817', '0747');
  if (!fs.existsSync(base + old)) { out('NEW DETAIL: ' + f); continue; }
  const a = keyFields(J(read(f))), b = keyFields(J(read(old)));
  if (JSON.stringify(a) !== JSON.stringify(b)) out('DETAIL ' + f.replace('20261126-0817-detail-', '') + ' :: ' + JSON.stringify(b) + ' -> ' + JSON.stringify(a));
}
// substatus/results/rounds
for (const f of fs.readdirSync(base).filter(x => x.startsWith('20261126-0817-') && (x.includes('substatus') || x.includes('results-') || x.includes('rounds-')))) {
  const old = f.replace('0817', '0747');
  if (!fs.existsSync(base + old)) { out('NEW FILE: ' + f); continue; }
  const a = read(f), b = read(old);
  if (a !== b) {
    const ja = J(a), jb = J(b);
    out('EXTRA DIFFERS: ' + f + ' :: ' + JSON.stringify(jb)?.slice(0, 300) + ' -> ' + JSON.stringify(ja)?.slice(0, 300));
  }
}
// leaderboard rank check for our entries: exact ID search in 0817 leaderboards
const ourIds = {
  'gta6-01': '01a1eb9c', 'tiny-chess-01': '01a1eb9c', 'tiny-stack-vm-01-run-20261122': '01a201a4',
  'best-card-game-20261122-1826': '01a204b1', 'hidden-spec-cli-01-run-20261122': '01a203c1',
  'sokoban-solver-01-run-20261121': '01a1fd7b', 'csv-reader-speed-01-run-20261121': '01a1fc27',
  'gta6-cover-art-01': '01a20ba8', 'gta6-trophy-guide-01': '01a211f6',
};
for (const [slug, frag] of Object.entries(ourIds)) {
  for (const pat of [`20261126-0817-${slug}-leaderboard.json`, `20261126-0817-lb-${slug}.json`]) {
    const t = read(pat);
    if (!t) continue;
    const idx = t.indexOf(frag);
    if (idx === -1) { out('LB ' + slug + ': our id NOT in window'); continue; }
    const m = t.slice(Math.max(0, idx - 400), idx + 200).match(/"rank":\s*(\d+)[^}]*"prize_rank":\s*(\d+)?/);
    out('LB ' + slug + ': found id, ctx=' + t.slice(Math.max(0, idx - 200), idx + 120).replace(/\s+/g, ' '));
  }
}
out('tight compare done');
