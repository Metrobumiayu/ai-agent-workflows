// compact compare 0847 vs 0817 — summaries only, no raw dumps
import fs from 'node:fs';
const base = '/home/hatch/workspace/make-fun/2026-11-26/';
const read = (f) => { try { return fs.readFileSync(base + f, 'utf8'); } catch { return null; } };
const J = (f) => { const t = read(f); if (!t) return null; try { return JSON.parse(t); } catch { return { __raw: t }; } };
const out = (s) => process.stdout.write(s + '\n');

// 1. account files
for (const f of ['me.json', 'wallets.json', 'agents-me.json']) {
  const a = read(`20261126-0847-${f}`), b = read(`20261126-0817-${f}`);
  out(f + ': ' + (a === b ? 'IDENTICAL' : (a === null || b === null ? 'MISSING' : 'DIFFERS')));
}

// 2. competitions list slug sets + per-slug key diffs
const listMap = (stamp) => {
  const m = new Map();
  for (const p of ['', '-p2', '-p3', '-p4', '-p5', '-p6']) {
    const j = J(`20261126-${stamp}-competitions${p}.json`);
    if (!j) continue;
    for (const c of (j.competitions || j.items || j.data || [])) m.set(c.slug || c.id, c);
  }
  return m;
};
const m47 = listMap('0847'), m17 = listMap('0817');
out('competitions slugs: 0817=' + m17.size + ' 0847=' + m47.size);
for (const s of [...m47.keys()].filter(x => !m17.has(x))) out('NEW SLUG: ' + s);
for (const s of [...m17.keys()].filter(x => !m47.has(x))) out('GONE SLUG: ' + s);
const keys = ['status', 'winner', 'winner_handle', 'prizesPaid', 'submissionCount', 'submissions', 'acceptingSubmissions', 'resolvedAt', 'announcement', 'payouts'];
for (const [slug, c] of m47) {
  const o = m17.get(slug); if (!o) continue;
  const diffs = [];
  for (const k of keys) { const a = JSON.stringify(c[k]), b = JSON.stringify(o[k]); if (a !== b) diffs.push(k + ': ' + b + ' -> ' + a); }
  if (diffs.length) out('LIST-DIFF ' + slug + ' :: ' + diffs.join(' | '));
}

// 3. detail files: key-field diffs only
const detKeys = ['status', 'winner', 'winner_handle', 'prizesPaid', 'submissionCount', 'acceptingSubmissions', 'resolvedAt', 'payouts', 'escrow', 'closesAt', 'deadline', 'opensAt'];
for (const f of fs.readdirSync(base).filter(f => f.startsWith('20261126-0847-detail-'))) {
  const old = f.replace('0847', '0817');
  if (!read(old)) { out('NEW DETAIL FILE: ' + f); continue; }
  const a = J(f), b = J(old);
  if (JSON.stringify(a) === JSON.stringify(b)) continue;
  const diffs = [];
  for (const k of detKeys) {
    const x = JSON.stringify(a?.[k]), y = JSON.stringify(b?.[k]);
    if (x !== y) diffs.push(k + ': ' + (y ?? '∅') + ' -> ' + (x ?? '∅'));
  }
  // nested payouts count
  const pa = a?.payouts, pb = b?.payouts;
  out('DETAIL-DIFF ' + f + ' :: ' + (diffs.length ? diffs.join(' | ') : '(other fields only)'));
}

// 4. substatus / results / rounds: summarize changed scalar keys
for (const f of fs.readdirSync(base).filter(f => f.startsWith('20261126-0847-') && (f.includes('substatus') || f.includes('results-') || f.includes('rounds-')))) {
  const old = f.replace('0847', '0817');
  if (!read(old)) { out('NEW FILE: ' + f); continue; }
  const a = J(f), b = J(old);
  if (JSON.stringify(a) === JSON.stringify(b)) continue;
  const flat = (o, pre = '', acc = {}) => {
    if (o && typeof o === 'object' && !Array.isArray(o)) for (const k of Object.keys(o)) flat(o[k], pre + k + '.', acc);
    else acc[pre.slice(0, -1)] = o;
    return acc;
  };
  const fa = flat(a), fb = flat(b);
  const ks = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  const diffs = [];
  for (const k of ks) { const x = JSON.stringify(fa[k]), y = JSON.stringify(fb[k]); if (x !== y) diffs.push(k + ': ' + y + ' -> ' + x); }
  out('EXTRA-DIFF ' + f + ' :: ' + diffs.slice(0, 12).join(' | ') + (diffs.length > 12 ? ' | ... +' + (diffs.length - 12) + ' more' : ''));
}

// 5. leaderboards: check our entry ids ranks (exact match search)
const ours = ['01a1eb9c-fa66-7142-9a92-53b5f81e0332','01a211f6-c0c7-71eb-a714-98c229815e49','01a20ba8-cab0-76f2-9430-3cb3935ee4f8','01a201a4-baf8-71b0-80e9-f792e5f47765','01a203c1-9562-755e-a72f-b06fd6002bf5','01a204b1-68ce-70f6-8c52-1e6b71e90d0f','01a1fd7b-c971-712d-954d-07d29eebd68c','01a1fc27-ed66-74b3-9189-1b679618ddb8','01a1ed4b-81d2-7374-84b2-8594a38ca982','01a1e974-7842-76d1-aa3f-81450100e186','01a1e53d','01a1e1ca'];
for (const f of fs.readdirSync(base).filter(f => f.startsWith('20261126-0847-') && f.includes('leaderboard'))) {
  const t = read(f); if (!t) continue;
  const old = read(f.replace('0847', '0817'));
  for (const id of ours) {
    const re = new RegExp('"id":"' + id.slice(0, 8) + '[^"]*"[^}]{0,400}?"rank":(\\d+)', 'g');
    const mA = [...t.matchAll(re)].map(m => m[1]);
    const mB = old ? [...old.matchAll(re)].map(m => m[1]) : [];
    if (mA.length || mB.length) out('LB ' + f.replace('20261126-0847-', '') + ' ' + id.slice(0, 8) + ' rank 0817=' + (mB[0] || 'absent') + ' 0847=' + (mA[0] || 'absent'));
  }
}
