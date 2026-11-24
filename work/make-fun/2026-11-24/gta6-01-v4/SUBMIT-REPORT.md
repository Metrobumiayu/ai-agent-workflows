# gta6-01 "Make GTA 6" — v4 SUBMIT REPORT: "Vice Bay"

**Submitted:** 2026-11-24T03:45:40.969Z (10:45 WIB 24 Nov 2026)
**Entry:** `01a20ba8-cab0-76f2-9430-3cb3935ee4f8` (FULL ID — match on this, never on a prefix)
**Claim code:** AF-HNZRA-EZDZD-CFZT6-GZS7V
**Commit:** `59f8fc714f106b549ce7fa99a351142ecb21d1fa` (`59f8fc7`)
**Anchor:** `69266445d0999685cf71525ef22b3a4397a007f7`, drand round 34228336
**Recording:** `01a20b70-092e-72b1-a95f-1854b326be8d` (sealed 2026-11-24T03:26:50.940Z, 253 chunks, 5 session files)
**Transcript bundle:** `transcripts-v4.tar.gz`, 13,673,019 B, sha256 `a3a1de64768e5b367c994170a6c51abdac465dcc92cadf769b825ff076616328`
**Source bundle (site):** sha256 `0387172ef4c7b9cfa3c3bd14afea463ddf898c43762740a5f8d89c58525cc033`, 429,585 B, repo `bundle:69266445d0999685cf71525ef22b3a4397a007f7`
**Run record:** makefun-run.json, 3,147 B, sha256 `7ab8549c98d4930967cdac7a2d49d8e45c97e5410fa59f9f906b4fcad4a543bb`
**Signed by wallet:** `5NWwTrA5LxQVEGC4R5XRJrszg16G5H9G6VRNJX2DgcGC` (agent wallet, payout wallet)
**HTTP:** 202 accepted. **Quota:** 4th of 5 today (1 left), 4 of 10 total.

## Live verification (parent-verified via /api/me + /api/agents/me, ~10:46 WIB)
- entry_count **28 → 29**
- /api/me entry: id `01a20ba8-cab0-76f2-9430-3cb3935ee4f8`, competition gta6-01 "Make GTA 6", **status preparing, error null**, title "Vice Bay", submitted_at 2026-11-24T03:45:40.969Z
- /api/agents/me: **stage submitted, round 4, outcome null, problem null**
- Intake checks (17): **13 pass, 4 skip, 0 fail** — account_wallet, competition_open, quota, form, entry_signature, repo_owner, license_osi, repo_created_after_open, commit_in_repo, duplicate_snapshot, source_bundle, committed_secret, security_audit PASS; repo_public, sponsor_self_entry, repo_readme, repo_about skip.
- Transcript-gate checks (transcripts_witnessed / thinking_priced / thinking_reproduces) still running at submit; a 5-min re-poll was in flight at report time — scoring is left to the monitor cron after that. Do NOT resubmit.

## Post-submit update — SCORED (~10:55 WIB, 5-min re-poll)
- /api/agents/me: **stage scored, round 4, outcome null, problem null.** All 31 checks visible.
- Transcript gates all **PASS** site-side: transcripts_witnessed (5 sessions, 253 chunks, 2,124 leaves; 475 messages, max lag **25 s** < 300 s), thinking_priced (1 usage record), thinking_reproduces **97.4%** (3,056/3,135), thinking_fresh, thinking_own_work, thinking_in_window (413 timestamps).
- **Leaderboard (live, 11,562 rows, full-ID match): v4 NOT ranked yet** — no judge matches so far, so no rank. The only 1-amanda row is still v3 (01a20b41 "Solara Bay", rank 5190, drifted from 5177) — that is stale history, NOT v4's rank. **Warning: another entrant (agus12-maulana) also titled their game "Vice Bay" (entry 01a2089c, rank 1087, 12W/0L) — never match on title; only the full submission ID 01a20ba8 counts for us.** Rank appears once judging runs; the monitor cron reports it on real change.

## Kit check (exact bundle + commit, 2026-11-24T03:43:37Z) — exit 0, ok true
**16 passed, 0 failed, 7 skipped, 3 submission-only.**
- thinking_priced **PASS** (1 usage record, priced to a known model)
- thinking_reproduces **PASS — 97.4%** (3,056 / 3,135 authored; 3 copied, 0 pasted, 72 read, 4 absent; 126 kit-starter lines left out)
- thinking_fresh PASS (all 3,056 credited lines from sessions showing the anchor line before the first write)
- thinking_own_work PASS (3,056 of 3,135; 0 lines from another entry's files, 0 from downloads)
- transcripts_run_record PASS (handed-off prompt, agent facts, system prompt uploaded, instruction files collected (1), 3 parent chats)
- thinking_in_window PASS, thinking_wellformed PASS (333 messages, 190 tool results), thinking_turns PASS (104 turns), thinking_revised PASS
- competition_open, snapshot (29 files, 549,421 B), license_osi (MIT), entrypoint (main.ts, node22), repo_created_after_open PASS
- transcripts_witnessed SKIP locally (site checks it from the live recording)

## What v4 is — "Vice Bay" (vs v3 "Solara Bay")
New city, new names, new story (Rook Calloway; crew Sal "The Shark", Dante, Mira).
- **16 missions in 3 acts** (v3: 10) — race, bank heist, chase, timed delivery, stealth, rampage, taxi, convoy, betrayal, finale
- **11 districts** (v3: 6), world 6400×4600 (v3: 4800×3600), **267 buildings** (v3: 166); landmarks: Vice Tower, Casino Royale, stadium, lighthouse, runway, port, marina; highway ring, 12 traffic lights
- **24 hidden packages**, **8 shops** (incl. Vice General hospital, $150 heal — new), 10 vehicle types (limo/bus new)
- Wanted 0–5 layered (patrol → foot cops → roadblock → heli + searchlight); traffic AI; peds flee gunfire; combat 5 weapons + drive-by + explosive barrels
- Economy: garage plating $600 / nitro $200, repeatable street race $500, 3 stunt jumps, rep rank Rookie→Kingpin + discounts
- Day/night + dynamic weather (grip 0.85 in rain); 2 WebAudio radio stations + SFX; HUD + live minimap; save/load
- `game/src/` 18 single-job modules ~3,800 lines; `vendor/makefun-game.ts` byte-identical with kit
- **Playtest 65/65 pass, 0 page errors, twice on final committed code** (mission 1 done +$450, police + heli at 4★, wanted decay, gun store purchase, safehouse + save, taxi fare, fail + retry, death + respawn)
- **Determinism:** main.ts 2 runs → dossier byte-identical (602,161 B)
- **Gates:** game/ 192 KiB, index.html 1,299 B, dossier 602,161 B (≤1.5 MiB), dossier text 159,008 B (≤163,840 B)
- **Screenshots (real renders, 1280×800, all ≤256 KiB, 0 page error):** 1-chase.jpg 82,769 B; 2-marina.jpg 79,597 B (on foot on Vice Beach sand at sunset, sea + lighthouse); 3-neon.jpg 84,829 B (rainy night Neon Strip, casino, wanted 2★); 4-finale.jpg 81,797 B (finale 5★, heli + searchlight, explosion)
- 7 real bugs found & fixed during playtest (all committed)

## The bundle parent-chain blocker — how it was fixed (for the record)
- Dry-run 1 (discovery + `--parent-session` main-chat only): "missing parent chats" — the bundle's 20 discovered sessions included the coordinator + parent sessions as evidence, so they could not be `--parent-session`, and no auto-derived chain reached the top.
- Dry-run 2 (added coordinator + parent as `--parent-session`): exit 1 — coordinator session refused ("one of the sessions this bundle carries as evidence").
- Fix, dry-run 3: `--no-discover --no-family --session <builder session file>` + `--parent-session` ×3 nearest-first (coordinator d08a758b, parent 519cfec6, main-chat 6461ff2f). Chain derived (depths 1–3) — but the top session failed the prompt match: "none of the 177 later messages the person sent in it is the prompt either".
- Root cause: `prompt-goahead.txt` held "bikin yang bener lah, biar bisa top 100 langsung, kesempatan upload nanti habis" — jolly's emphasis as RELAYED by the parent. That text exists in the main-chat session only inside agent messages (quotes), never as a user message. v3's prompt file was the widget-tap text "Gas v3, rebuild + resubmit", which IS a user message in 6461ff2f — that is why v3 passed.
- Fix: `prompt-goahead.txt` rewritten to jolly's exact widget-tap user message **"Gas v4, rebuild + resubmit"** (verified as a user item in session 6461ff2f). Dry-run 4 PASSED (exit 0, no missing). Same flags used for the real bundle and for submit.
- Lesson for future strict entries: the prompt file must be the person's EXACT user message text as it appears in the top parent session — use the widget-tap / typed message verbatim, never a relayed paraphrase or a quote embedded in an agent message.
- Submit needed `--competition gta6-01` in addition to `--recording` (first submit attempt exit 2 without it).
- The submit output again suggested adding a profile bio — ignored, as always. No profile change made.

## Force_Last warning
Submitting v4 replaced v3 (entry `01a20b41`, rank 5177) as the counting entry. v3 no longer counts. Do NOT resubmit anything for gta6-01 without a new instruction from jolly. Quota: 1 entry left today, 6 of 10 total left.

## Timeline (WIB 24 Nov)
- 09:24 jolly: "Gas v4, rebuild + resubmit" + "bikin yang bener lah, biar bisa top 100 langsung, kesempatan upload nanti habis"
- 09:37 jolly: LANJUT (record help for syntax only, v2/v3 pattern)
- 09:43 recording 01a20b70 started (3rd attempt; attempt 1 died on non-git repo, attempt 2 on 8-open-recordings 409 — orphan 01a20b6c sealed to free a slot)
- 10:24 builder done: commit 59f8fc7, playtest 65/65, 0 errors
- 10:26 recording sealed (5 session files, 1 usage row attached)
- 10:30–10:40 bundle parent-chain blocker investigated + fixed (dry-runs 1–4)
- 10:43 bundle written (13,673,019 B); kit check 16 pass / 0 fail
- 10:45 SUBMITTED, HTTP 202, entry 01a20ba8; verified live 10:46 (entry_count 29, stage submitted, intake 13 pass / 4 skip / 0 fail)
- Entries close 22:00 WIB 24 Nov; result due 2026-12-10T15:00:00Z.
