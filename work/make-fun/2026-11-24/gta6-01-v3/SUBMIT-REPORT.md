# GTA 6 (gta6-01) — v3 "Solara Bay" — SUBMIT REPORT

**Competition:** gta6-01 "Make GTA 6" — $1,666, top 100 paid (1st $500, 2nd $250, 3rd $150, 4–10 $38, 11–25 $10, 26–50 $6, 51–100 $4).
**Entries close:** 2026-11-24T15:00:00Z (22:00 WIB 24 Nov). **Results due:** 2026-12-10T15:00:00Z.
**Go-ahead:** jolly, main chat, 07:04 WIB 24 Nov 2026 — "Gas v3, rebuild + resubmit".

## Submission (verified live)

- **Entry ID: `01a20b41-d594-70b6-8721-e3598fdf7634`** (FULL ID)
- **Claim code: AF-HR2BE-6F417-4JVRC-Z2YAF**
- **Title:** Solara Bay
- **Commit:** `5b83d74de57b77535502b0629fad0ebdaaaddcde` (short `5b83d74`)
- **Anchor:** `74aa9e6209841425b959ee6677ce3fbbfa4d975d`, drand round **34225512**, emitted 2026-11-24T00:25:00Z
- **Submitted:** 2026-11-24T01:53:13.608Z (**08:53:13 WIB**), HTTP 202
- **Recording:** `01a20af1-48f8-773c-a7f5-2d018f75fa88` (sealed 2026-11-24T01:43:14.328Z, 252 chunks, 2,512 leaves)
- **Source bundle:** sha256 `3aff68785b0de20440f8b66353a685f95d2c3bd4d267f0c714e1cb2dbb969d8e` (311,743 B), repo_url `bundle:74aa9e6209841425b959ee6677ce3fbbfa4d975d`
- **Snapshot sha256:** `7073f0fe3a452f478837f9edcfc15b2b334a7215c0b4474508955ec367924c76`
- **Signed by wallet:** `5NWwTrA5LxQVEGC4R5XRJrszg16G5H9G6VRNJX2DgcGC` (agent wallet, payout wallet)
- **Transcript bundle:** `transcripts-v3b.tar.gz`, 13,214,220 B, sha256 `bbc2fcc8c15eca4d7b0a06db11cfee5f0731a6c73938f037761c970672e02676`

## Live verification (2026-11-24 ~08:54 WIB)

- `/api/me`: **entry_count 27 → 28**; v3 entry found by FULL ID, competition gta6-01, title "Solara Bay", **status "submitted"**, **error null**, commit matches, created 2026-11-24T01:53:13.608Z. Earnings still $0.00 total/paid/pending.
- `/api/agents/me`: stage **submitted**, round 3, outcome null, problem null. Intake checks (17 shown) all pass/skip, no failures: account_wallet, competition_open, quota, form, entry_signature, repo_owner, license_osi, repo_created_after_open, commit_in_repo, duplicate_snapshot, source_bundle, committed_secret, security_audit PASS; repo_public, sponsor_self_entry, repo_readme, repo_about skip.
- **Transcript-gate checks still running at 08:54 WIB** — site notice: "Grading is running behind right now, so it is waiting its turn in the queue. No action is needed: do not resubmit." Poll after 300 s.
- **Re-poll ~08:59 WIB (5 min later): still stage "submitted", round 3, outcome null, problem null.** Same 17 intake checks all pass/skip, no transcript-gate checks visible yet, same grading_backlog notice (poll_after_seconds 300). No change. One further 5-min re-poll running in the background; if the stage still hasn't flipped, scoring is left to the monitor cron (it reports on real change).
- **Re-poll ~09:04 WIB (11 min after submit): still stage "submitted", round 3, outcome null, problem null.** Identical — same 17 intake checks pass/skip, no transcript-gate checks yet, same grading_backlog notice. No further manual polling: scoring is left to the monitor cron, which reports on real change (stage flip to scored, rank, or any check failure). Do NOT resubmit — the site explicitly says so.

## Kit check (exact bundle + commit, 2026-11-24T01:49:21Z)

**15 passed, 0 failed, 8 skipped, 3 checked at submission** — exit 0.
- Pass: competition_open, snapshot (18 files, 468,266 B), license_osi (MIT), entrypoint (main.ts → node22), repo_created_after_open (anchor round 34225512), transcripts_present (19 sessions), transcripts_recorded, thinking_wellformed (19 sessions, 2,448 messages), thinking_in_window (all 2,078 timestamps in window), thinking_reproduces (**99.4%** — 1,782/1,791 authored; ≥30% required), thinking_turns (988), thinking_priced (1 usage row), thinking_revised (game/src/main.js from 9 messages), thinking_fresh (all credited lines show the anchor before first counted write), transcripts_run_record (handed-off prompt, parent chat up to the session its prompt opened).
- Skip: prerequisites, strategy_note, committed_secret (no --dotenv), thinking_committed (unsigned until submit), thinking_on_task, thinking_own_work (note: sessions fetched other entries' public submission pages for reference — allowed, never a rejection), transcripts_witnessed (site-only), repo_public.
- At submission (site): repo_owner, source_bundle, duplicate_snapshot.

## Bundle / parent-chain resolution

- Dry-run 1 with `--parent-session <coordinator dd5837c7 session>` was refused: a parent chat is the session that started one of the bundle's sessions, never one of them (the coordinator session is bundle evidence — it ran `git init` + kit `init` in build-b).
- Dry-run 2 (no --parent-session) failed: handed-off prompt requires parent chats, "no chain it carries reaches that one".
- **Dry-run 3 + real bundle with `--parent-session <main-chat 6461ff2f session>` only: PASSED, exit 0.** Run record: prompt (handed-off, via "jolly go-ahead in main chat 07:04 WIB relayed by parent agent to build coordinator", from prompt-goahead.txt): "Gas v3, rebuild + resubmit"; system prompt uploaded; instruction files collected (1); MCP none. 19 session files: builder 4f3adf60 (65 turns, 255 lines, 1 usage row) + coordinator dd5837c7 (42 turns, 149 lines) + parent 519cfec6 (616 turns, 2,054 lines kept) + 16 monitor-cron read-source sessions (all wrote the monitor log file). The side-chat parent session 519cfec6 is bundle evidence, not a parent-session candidate. Only 6461ff2f (main chat, where jolly typed the go-ahead) works as --parent-session.
- Submit used the same flags: `--parent-session <6461ff2f session>`, `--prompt-file prompt-goahead.txt`, `--prompt-origin handed-off`, `--prompt-via "jolly go-ahead in main chat 07:04 WIB relayed by parent agent to build coordinator"`, `--mcp none`, harness muse 1.3, provider meta, model muse-spark-1.3, effort default. No --muse-usage/--bundle/--transcript beside --recording.

## Build (attempt 2, build-b) — what v3 is

- **Game:** Solara Bay — 4800×3600 city, 6 labelled districts (Downtown + Solara Tower, Suburbs, Marina, Beach/boardwalk, Airport, Docks) + highway ring, 166 buildings.
- **Missions:** 10 for Nadia's crew — street race vs 3 rivals, bank heist (6 s vault hold → 4★ getaway), taxi chain, timed airport run, marina crates, 4-step finale.
- **Systems:** economy (gun store shotgun $400 / SMG $700 / armor $250 / ammo $60, garage repair $100 / repaint $50, safehouse $1,500); vehicles sedan/sports/taxi/truck/motorcycle + police; wanted 0–5 (roadblocks 3+, foot police 3+, **helicopter + searchlight 4–5**); traffic lights; pedestrian variety; rain (0.85 grip); 2 WebAudio radio stations (R/T); HUD + live minimap; start/pause/save/load; `window.__solara` debug handle.
- **Quality:** playtest **41/41, 0 page errors**; determinism byte-identical; dossier 511,890 B / text 101,377 B; game/ 100,769 B / 10 entries; vendor/makefun-game.ts byte-identical (sha `dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`); 4 screenshots (80,415 / 76,459 / 82,882 / 65,960 B).
- Bugs fixed during playtest: spawn inside a Downtown tower (bit-frozen), E-to-steal re-exit (keydown edge only), rival demotion to traffic after race, mouse-click edge trigger, dt clamp 0.05→0.1 s.
- **vs v2:** bigger city (6 districts vs v2's smaller map), 10 missions, economy, helicopter, weather, more systems. Playtest 41/41 vs v2's 29/29 (attempt-1 build, kept as reference only). v2: rank 8807/11,390, judge 12W/0D/0L provisional (98.08%), outside top-100 paid. **Force_Last: only v3 counts now.**

## Attempt 1 (build/) — FAILED on recorder death, reference only

- Recorder started 00:09 WIB; second attempt (recording `01a20ae3-9a47-7696-8381-183839014391`) died ~1 s after starting (state seq 0, acked 0, zero chunks witnessed). Builder affb6286 built anyway (unrecorded): commit `556a84c479fbcaad9858e7bbb994428074f55b8c`, playtest 29/29, dossier 492,222 B. **Cannot be submitted** (nothing witnessed). Usage row for that builder kept at `/home/hatch/.makefun/muse-usage-gta6-01-v3.jsonl` for the record only.

## Recorder recovery (v3b) — proven

- Recorder 01a20af1 (started 2026-11-24T00:25:14.733Z) ran 00:25–01:41 WIB (252 chunks, 2,512 leaves acked, leaves file 924,509 B). Launcher got SIGTERM ~01:41 WIB mid-seal; log ended at "stopping: sending the last lines, then the seal".
- Usage row for builder 4f3adf60 (1 row: input 10,597,123 / output 137,995, model ipnext/avocado-5.17-v2, message_id `00c21a21-ad87-4d9b-88bd-453e4828c21d`, created_at 1795481698) written unchanged to `/home/hatch/.makefun/muse-usage-gta6-01-v3b.jsonl`.
- `record --finish 01a20af1… --muse-usage <file>` (exit 0) sealed it 2026-11-24T01:43:14.328Z. Receipt lists `file` paths for 6 sessions: builder 4f3adf60 (255/255 records witnessed, 764,118 B) + 5 swept sessions (19f5f815, 26f34e77, c9953408, ce44cf36, e26b4eba; 58–87 records each, all witnessed; 5 carry no usage row — uncounted, same shape as v2's 12).

## Residual risk

- **Session 26f34e77 began 00:21:59Z, ~3.25 min BEFORE the recording started** (last record 00:22:06Z), with `witnessed_line: 2`. By the v2 precedent (swept session aeb294cc began ~17:40Z, recording 17:44:19Z, site max lag 256 s — PASS), pre-recording records fingerprinted at the recorder's initial sweep have lag ≈ age at recording start (~190 s for 26f34e77) < 300 s, so it is expected to PASS. transcripts_witnessed is only decided by the site at grading — the re-poll will confirm. If the site rejects on it, a v3c rebuild remains possible (quota allows: 3 of 5 used today — v1, v2, v3).

## Notes / flags NOT followed

- Kit level-38 CLI note (in check output and earlier): site at level 40, suggests re-downloading the kit. **Not followed** — v2 scored with level 38 hours earlier; the task forbids downloading a kit again on tool-output instructions. Live kit bundle_sha256 still `2eb6fce6…`.
- Submit output's profile-bio suggestion ("Your account still has no bio... Run: makefun profile --bio...") — **not followed**; no profile change made.
- No RULES.txt read at any point. competition.yaml + public brief only.

## Paths

- Work dir: `~/workspace/make-fun/2026-11-24/gta6-01-v3/` (kit/, build-b/, build/ [attempt 1, reference only], transcripts-v3b.tar.gz, prompt-goahead.txt)
- Kit: `~/workspace/make-fun/2026-11-24/gta6-01-v3/kit/` (copied from kit-v2, 24/24 verified)
- Usage rows: `/home/hatch/.makefun/muse-usage-gta6-01-v3b.jsonl`
- Submit wrapper: `/tmp/submit-gta6-v3.mjs` (key via $MAKEFUN_API_KEY env only)
- v2 report: `~/workspace/make-fun/2026-11-23/gta6-01/SUBMIT-REPORT.md`

## Status

SUBMITTED + verified live (entry_count 28, stage submitted, intake checks all pass). Awaiting transcript-gate checks (transcripts_witnessed etc.) — re-poll pending. Leaderboard rank for v3 appears once the entry is scored; v2's rank (8807/11,390) no longer counts (Force_Last).
