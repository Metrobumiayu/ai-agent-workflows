// main.ts — The Golden Ladle entrypoint.
//
// Hands the game in: copies this repo's game/ and screenshots/ into the
// output directory and writes output/dossier.json with the vendored
// make.fun dossier library. Run with Node 22, standard library only:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader the output directory is /output; outside it the
// MAKEFUN_OUTPUT_DIR environment variable stands in for it.
//
// Safety: this program only creates directories and copies into them. It
// never deletes anything — the output directory is left exactly as found
// apart from the files it adds.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'game'), { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's own gates so a bad entry fails here,
// loudly, instead of silently at grading time.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
