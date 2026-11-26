// compare 0817 vs 0747 snapshots
import fs from 'node:fs';
const base = '/home/hatch/workspace/make-fun/2026-11-26/';
const out = (s) => process.stdout.write(s + '\n');
const read = (f) => { try { return fs.readFileSync(base + f, 'utf8'); } catch { return null; } };
const cmp = (a, b) => { const x = read(a), y = read(b); if (x === null || y === null) return 'MISSING ' + a + '/' + b; return x === y ? 'IDENTICAL' : 'DIFFERS'; };

// 1. account files
for (const f of ['me.json', 'wallets.json', 'agents-me.json']) out(f + ': ' + cmp(`20261126-0817-${f}`, `20261126-0747-${f}`));

// 2. competitions list: slug sets across pages
const slugs = (stamp) => {
  const set = new Set();
  for (const p of ['', '-p2', '-p3', '-p4', '-p5', '-p6']) {
    const t = read(`20261126-${stamp}-competitions${p}.json`);
    if (!t) continue;
    try { const j = JSON.parse(t); for (const c of (j.competitions || j.items || j.data || [])) set.add(c.slug || c.id); } catch {}
  }
  return set;
};
const s17 = slugs('0817'), s47 = slugs('0747');
out('competitions slugs: 0747=' + s47.size + ' 0817=' + s17.size);
for (const s of [...s17].filter(x => !s47.has(x))) out('NEW SLUG: ' + s);
for (const s of [...s47].filter(x => !s17.has(x))) out('GONE SLUG: ' + s);

// 3. competitions list item diffs (status/winner/prizesPaid/subs) — compare per slug via parsed lists
const listMap = (stamp) => {
  const m = new Map();
  for (const p of ['', '-p2', '-p3', '-p4', '-p5', '-p6']) {
    const t = read(`20261126-${stamp}-competitions${p}.json`);
    if (!t) continue;
    try { const j = JSON.parse(t); for (const c of (j.competitions || j.items || j.data || [])) m.set(c.slug || c.id, c); } catch {}
  }
  return m;
};
const m17 = listMap('0817'), m47 = listMap('0747');
for (const [slug, c] of m17) {
  const o = m47.get(slug);
  if (!o) continue;
  const keys = ['status', 'winner', 'winner_handle', 'prizesPaid', 'submissionCount', 'submissions', 'acceptingSubmissions', 'resolvedAt', 'announcement'];
  const diffs = [];
  for (const k of keys) { const a = JSON.stringify(c[k]), b = JSON.stringify(o[k]); if (a !== b) diffs.push(k + ': ' + b + ' -> ' + a); }
  if (diffs.length) out('LIST-DIFF ' + slug + ' :: ' + diffs.join(' | '));
}

// 4. detail files diff
const det17 = fs.readdirSync(base).filter(f => f.startsWith('20261126-0817-detail-'));
for (const f of det17) {
  const old = f.replace('0817', '0747');
  if (!fs.existsSync(base + old)) { out('NEW DETAIL FILE: ' + f); continue; }
  const r = cmp(f, old);
  if (r !== 'IDENTICAL') out('DETAIL ' + r + ': ' + f);
}

// 5. substatus + results + rounds diffs
for (const f of fs.readdirSync(base).filter(f => f.startsWith('20261126-0817-') && (f.includes('substatus') || f.includes('results-') || f.includes('rounds-')))) {
  const old = f.replace('0817', '0747');
  if (!fs.existsSync(base + old)) { out('NEW FILE: ' + f); continue; }
  const r = cmp(f, old);
  if (r !== 'IDENTICAL') out('EXTRA ' + r + ': ' + f);
}
out('compare done');
