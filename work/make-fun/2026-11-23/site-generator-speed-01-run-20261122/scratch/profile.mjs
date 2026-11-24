// Profile the baseline build per phase on the practice set.
import { readFileSync } from 'node:fs';
const K = new URL('../kit/site-generator-speed-01-run-20261122-kit/baselines/makefun-site/', import.meta.url);
const lib = await import(new URL('vendor/makefun-site/index.js', K).href);
const cases = JSON.parse(readFileSync(new URL('../kit/site-generator-speed-01-run-20261122-kit/practice/input/cases.json', import.meta.url), 'utf8'));
const expected = JSON.parse(readFileSync(new URL('../kit/site-generator-speed-01-run-20261122-kit/practice/reference/expected.json', import.meta.url), 'utf8'));
const byId = new Map(expected.cases.map(c => [c.id, c.output]));

function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v !== null && typeof v === 'object') { const ks = Object.keys(v).sort(); return `{${ks.map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`; }
  return JSON.stringify(v) ?? 'null';
}

for (const c of cases) {
  const t0 = process.hrtime.bigint();
  const out = lib.build(c.input);
  const t1 = process.hrtime.bigint();
  const ok = canon(out) === canon(byId.get(c.id));
  console.log(c.id, 'match:', ok, 'ms:', Number(t1 - t0) / 1e6, 'outFiles:', Object.keys(out).length);
}
