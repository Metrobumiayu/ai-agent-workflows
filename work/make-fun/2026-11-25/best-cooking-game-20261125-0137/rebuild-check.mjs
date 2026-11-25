// rebuild-check.mjs — Independently rebuild the dossier from the out dir
// with the kit's own vendor library and compare byte-for-byte with what
// main.ts wrote.
import { readFileSync } from 'node:fs';
import { buildDossier } from '/home/hatch/workspace/make-fun/2026-11-25/best-cooking-game-20261125-0137/kit/best-cooking-game-20261125-0137-kit/starter/vendor/makefun-game.ts';

const out = '/home/hatch/workspace/make-fun/2026-11-25/best-cooking-game-20261125-0137/out';
const rebuilt = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
const existing = readFileSync(out + '/dossier.json', 'utf8');
console.log('rebuilt bytes:', Buffer.byteLength(rebuilt), 'existing bytes:', Buffer.byteLength(existing));
console.log(rebuilt === existing ? 'DOSSIER MATCHES' : 'DOSSIER DIFFERS');
process.exit(rebuilt === existing ? 0 : 1);
