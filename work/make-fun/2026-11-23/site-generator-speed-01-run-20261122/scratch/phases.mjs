import { readFileSync } from 'node:fs';
const K = new URL('../kit/site-generator-speed-01-run-20261122-kit/baselines/makefun-site/', import.meta.url);
const lib = await import(new URL('vendor/makefun-site/index.js', K).href);
const tpl = await import(new URL('vendor/makefun-site/lib/template.js', K).href);
const cases = JSON.parse(readFileSync(new URL('../kit/site-generator-speed-01-run-20261122-kit/practice/input/cases.json', import.meta.url), 'utf8'));
const byCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const names = ['readSources','frontMatter','permalinks','markdown','collections','tags','layouts','report'];
for (const c of cases) {
  const input = c.input;
  const templates = new Map();
  const report = [];
  const tParse0 = process.hrtime.bigint();
  for (const name of Object.keys(input.templates).sort(byCodeUnits)) {
    try { templates.set(name, tpl.parseTemplate(name, input.templates[name])); }
    catch (err) { if (!(err instanceof tpl.TemplateError)) throw err; report.push(err.message); }
  }
  const tParse1 = process.hrtime.bigint();
  const b = { input, base: input.site.base_url.replace(/\/+$/, ''), templates, sources: [], statics: [], bySource: new Map(), broken: new Set(), report, posts: [], tags: [], cards: new Map(), output: {} };
  const times = {};
  for (let k = 0; k < lib.PIPELINE.length; k++) {
    const t0 = process.hrtime.bigint();
    lib.PIPELINE[k](b);
    const t1 = process.hrtime.bigint();
    times[names[k]] = Number(t1 - t0) / 1e6;
  }
  console.log(c.id, 'parseTpl:', (Number(tParse1-tParse0)/1e6).toFixed(1)+'ms', JSON.stringify(times), 'total:', Object.values(times).reduce((a,x)=>a+x,0).toFixed(1)+'ms');
}
