# BUILDER-STATUS — make.fun gta6-01 v4 "Vice Bay"

**Status: BUILD + TEST + COMMIT DONE — ready for seal/bundle/check/submit (coordinator).**
Updated ~10:35 WIB Tue 24 Nov 2026. Deadline 22:00 WIB 24 Nov 2026.

## Identity

- Recording: `01a20b70-092e-72b1-a95f-1854b326be8d`
- Anchor: `69266445d0999685cf71525ef22b3a4397a007f7`, drand round `34228336`
- HEAD commit: `59f8fc714f106b549ce7fa99a351142ecb21d1fa` (`59f8fc7`)
  - `5398a3e` — v4 game (27 files, 5,170 insertions)
  - `59f8fc7` — muzzle flash 0.06s → 0.15s (visible on slow frames)
- Repo: `~/workspace/make-fun/2026-11-24/gta6-01-v4/build/` — working tree clean.

## What was built — "Vice Bay" (vs v3 "Solara Bay")

New name, characters and story: Rook Calloway returns to Vice Bay; crew Sal "The Shark",
Dante, Mira. **16 missions in 3 acts** (Homecoming / The Takeover / The Kingpin) vs v3's 10 —
types: race, bank heist, chase, timed delivery, stealth, rampage, taxi, convoy, betrayal, finale.
**11 districts** with own palettes (vs 6), world 6400×4600, **267 buildings** (vs 166),
landmarks (Vice Tower, Casino Royale, stadium, lighthouse, runway, port cranes, marina piers,
parks/plaza), highway ring, 12 traffic lights, **24 hidden packages**, **8 shops** (Sal's Bar,
Ammo-Nation, Dante's Customs garage, safehouse $1500, Casino Royale, taxi stand, street race,
Vice General hospital $150 heal). 10 vehicle types (sedan/sports/muscle/taxi/truck/van/bus/limo/
moto/police). Wanted 0–5 (patrol → foot cops → roadblocks → heli + searchlight). Traffic AI
(red lights, swerve, recycle), peds that flee gunfire, combat (fists/pistol/shotgun/SMG/rifle,
drive-by, explosive barrels), economy (gun store, garage repair $100/repaint $50/plating $600/
nitro $200, taxi fares, repeatable street race $500, 3 stunt jumps, rep ranks Rookie→Kingpin
with shop discounts), day/night cycle + dynamic weather (clear/drizzle/rain, grip 0.85 in rain),
2 WebAudio radio stations (VIBE 98.5 funk, HARBOR ROCK) + SFX, HUD + live minimap with blips,
title/briefing/shop/pause/mission-list/dead/ending screens, localStorage save/load.

Structure (judge criterion #5): `game/src/` — 18 modules, one job per file, ~3,800 lines,
game/ 192 KiB. `vendor/makefun-game.ts` byte-identical to kit (sha256
`dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`).

## Verification

- **Playtest: 65/65 passed, 0 page errors** — twice consecutively on the final committed code
  (driver `/tmp/shot-tool/playtest.js`). Covers: world gen, walk/drive/steal, shooting + ammo,
  radio cycle, mission 1 complete + $450 payout, police spawn + heli at 4★, wanted decay,
  gun store buy, safehouse + save, package collect, pause/mission-list, mission 2 start,
  taxi fare delivery, mission fail + retry, death + respawn.
- **Bugs found & fixed during playtest** (all in final commit):
  1. `combat.js`: `pointInBuilding(G.city, …)` → `pointInBuilding(G.city.buildings, …)`.
  2. `main.js`: missing `addFloater` import (pickup loop threw every frame on a pickup).
  3. `police.js`: heli counted in wanted-decay proximity (heat unlosable at 4–5★).
  4. `main.js` frame loop: edge keys (E/R/digits) processed twice per slow frame
     (enter+exit a car in one frame) — pressed keys now consumed after the first update.
  5. `police.js`: foot-cop / patrol spawns clamped onto the player near world edges —
     new `spawnAway()` helper guarantees ~900 px distance.
  6. `main.js`: shop-vs-car E priority is now closest-wins (car at a shop door no longer
     blocks the shop). `combat.js`: muzzle flash 0.06s → 0.15s.
  7. Playtest driver hardened (polling instead of fixed waits — game time runs slower
     than wall time on this VM).
- **Determinism:** `main.ts` run twice → dossier byte-identical (602,161 B).
- **Gates:** game/ 192 KiB (≤48 MiB), index.html 1,299 B (≤1 MiB), dossier 602,161 B
  (≤1.5 MiB), dossier text 159,008 B (≤163,840 B).

## Screenshots (real renders, 1280×800 JPEG, all ≤256 KiB, 0 page errors)

- `1-chase.jpg` — 82,769 B — downtown chase, wanted 4★, Bank Job getaway, police + smoke
- `2-marina.jpg` — 79,597 B — on foot on Vice Beach sand at dusk, ocean, lighthouse, peds
- `3-neon.jpg` — 84,829 B — night rain Neon Strip, casino, headlights, wanted 2★
- `4-finale.jpg` — 81,797 B — finale 5★ getaway, heli + searchlight, explosions

## Nothing failed / nothing outstanding for the builder

- No blockers. Serve on :8080 was used for renders/playtest (background, log `/tmp/serve.log`).
- Coordinator owns: seal / bundle / check / submit. Do NOT submit from the builder session.
- Note: Force_Last — this v4 replaces v3 (entry 01a20b41) on submit. Quota: 1 entry left
  today after v4.
