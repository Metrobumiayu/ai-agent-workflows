# best-cooking-game-20261125-0137 — BUILDER STATUS (2026-11-25, ~09:17 WIB)

## Game — "THE GOLDEN LADLE" (built, playtested, NOT submitted)
Original 2D canvas cooking game, 3-minute shift, target 300 points to win. Orders with
countdowns on an order board, 5 ingredient bins, chopping board (2.5s), 2-burner stove
(4s cook + 4s to burn), plate assembly, serve window, trash, score/coins/streak,
difficulty ramp, title/pause/win/lose screens, restart, WebAudio synth SFX, keyboard + mouse.

## Kit init — DONE
Anchor: `makefun anchor 1bf4c061586435817cd7f3656fed830cfe78828b round 34256262`
LICENSE (MIT) present, `.makefun/freshness.json` present.

## Files (all authored in the builder session with write/edit tools)
Repo: `/home/hatch/workspace/make-fun/2026-11-25/best-cooking-game-20261125-0137/repo/`
- `game/index.html` (1,173 B)
- `game/src/config.js`, `audio.js`, `state.js`, `stations.js`, `input.js`, `render.js` (14,144 B), `main.js` — game/ total 43,941 B, 10 files+dirs, 0 symlinks
- `main.ts` (fresh write), `package.json` (`{"type":"module"}`)
- `vendor/makefun-game.ts` — shell-copied unchanged from kit starter; sha256 verified identical: `dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`
- `screenshots/1-title.jpg` (80,803 B), `2-mid-play.jpg` (73,335 B), `3-ready-to-serve.jpg` (66,005 B), `4-win.jpg` (61,113 B) — visually verified by the builder: title, order board + bins + mid-chop + cooking patty + plate mid-assembly + timer, plate ready at serve window, win screen. All five required elements visible across the set.

## Playtest — 28/28 checks passed (Playwright, chromium-1148)
Boots with 0 page errors; title → Enter start; keyboard move; mouse click grab; trash;
patty cook + pickup; lettuce chop + pickup; plate assembly (3 items); correct serve raised
score 0→73 and consumed the order; wrong dish rejected (score unchanged, plate kept); order
expiry counted; P pause/resume with clock frozen; reaching target wins; R restarts after win
and after loss; clock-out below target loses. One real bug found and fixed during testing
(cooked patty's item state was never set to `'cooked'` in `state.js` tick).

## Determinism — confirmed by builder
`main.ts` run twice with `MAKEFUN_OUTPUT_DIR=out` / `out2`, `diff -r` clean.
dossier.json 421,475 B (under 1.5 MiB cap). No `http://`, `https://`, `//host`, `eval(`,
`new Function`, `fetch(` in game/.

## Open items (NOT done — builder session ended at ~09:17 WIB)
1. Independent dossier rebuild check INCONCLUSIVE (builder's check script compared a
   non-string return value; the two `main.ts` runs being byte-identical is the stronger
   signal, but the rebuild must be re-run properly before submitting).
2. Screenshots are 1280x721, not 1280x720 (element-screenshot off-by-one). Within gate
   limits (long side ≤1280, short side ≥480) but should be re-captured with an explicit
   1280x720 clip.
3. Kit check (`makefun check`) never run.
4. Git commit NOT done. Kit init created `.git` in repo/ (2 commits exist from init:
   LICENSE + anchor); no commit of the game files yet, no `submission` branch.
5. No submission attempted (correct — coordinator submits).

## BLOCKED — execution-risk flag (2026-11-25 ~09:25 WIB)
The coordinator's `ls`/`git status` read of the repo tripped a system execution-risk
check on the repo content. Per that notice, the remaining steps — re-capturing
screenshots, running `main.ts`, kit check, `git commit`, bundle, submit — must NOT be
run until the user gives a plain go-ahead. The coordinator stopped and reported this
to the parent agent; nothing was submitted. Entry count still 29, earnings $0.00.
First blind-round cutoff 11:37 WIB; entries close 20:37 WIB today.
