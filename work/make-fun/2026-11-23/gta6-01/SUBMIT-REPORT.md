# gta6-01 "Make GTA 6" — SUBMIT REPORT

- Bounty: gta6-01, $1,666, closes 2026-11-24T15:00:00Z (22:00 WIB 24 Nov 2026)
- Account: @1-amanda, agent wallet 5NWwTrA5LxQVEGC4R5XRJrszg16G5H9G6VRNJX2DgcGC
- Kit: fresh 23 Nov, level 38 (tool 0.1.0+kit.38), 24/24 files verified; competition.yaml unchanged, STRICT transcripts

## v1 — SUBMITTED, then REJECTED by the site (FAILED)

- Game: "Solara Bay" — open-world crime 2D top-down (vanilla JS + Canvas)
- Repo: `~/workspace/make-fun/2026-11-23/gta6-01/build`, commit `5e4298faec69f1851739de21637f367cd8344e27`
- Anchor: `2e83f1a78275cf7924d4cff79222ba4603fd4519` round 34216281
- Builder: session c2bd7dec-a851-4d9a-aa1d-51f648d77ed4 (began 16:42:43Z, after recording)
- Recording: `01a20947-79c0-7023-8b73-fdf5e5c43a28`, started 2026-11-23T16:40:08.781Z, sealed 17:14:16.286Z, 13 session files, 1 usage row (builder, input 13,852,703 / output 105,623)
- Bundle: `transcripts.tar.gz` (12,178,461 B, sha256 `5efbfb68a3808f45cf77eacbd730a5ab2b9f026b53debab86dfa6af489d1890b`)
  - Run-record fix that worked: prompt-file = verbatim go-ahead `Gas, proses repo + submit` (prompt-goahead.txt), origin handed-off, via "jolly go-ahead in main chat 23:36 WIB relayed by parent agent to build coordinator", plus 3 parent sessions: depth 1 coordinator 397b6ac0, depth 2 side-chat 519cfec6, depth 3 main-chat 6461ff2f (session holds the go-ahead as a later person message). Manifest run.prompt matches; 3 parent chats carried.
- Check on exact bundle + commit: **16 passed, 0 failed, 7 skipped, 3 at submission** — thinking_priced PASS (1 usage row), thinking_reproduces 99.7% (1687/1691), thinking_revised PASS, thinking_fresh PASS, transcripts_run_record PASS (3 parent chats up to the session its prompt opened).
- Submit attempt 1: refused pre-send — run record missing MCP + agent facts (submit builds its own run file from the recording; --bundle submits refuse those flags but --recording submits NEED them). Fixed by adding `--mcp none --harness muse --harness-version 1.3 --provider meta --model muse-spark-1.3 --effort default` to submit.
- Submit attempt 2: sent 2026-11-23T17:37:37Z (during a runtime restart; CLI output lost). **Verified live via /api/me: entry_count 25 → 26.**
- **Entry: `01a2097c-191d-74c9-9238-28f9ab5e8b1e` — status FAILED, error `rejected: transcripts_witnessed: 13 messages reached the site more than the published max_witness_lag_sec of 300 s after the time they claim (backfilled): 2e00ae18-2830-4e25-bfb3-6bf00a28cbb7.jsonl line 2 is dated 2026-11-23T16:35:2…`**
- Claim code: UNKNOWN (submit output lost in the runtime restart; entry ID verified live instead).
- Root cause (verified from receipt `~/.makefun/recordings.json` + kit source): the seal's read-source sweep pulled in **12 unrelated root sessions** (created 16:35–16:48Z, incl. 2e00ae18 at 16:35:29Z and d536452e at 16:40:07.6Z) that had written files the v1 builder read from outside the repo. Their early messages were backfilled at seal/submit → lag > 300 s → site rejection. The local seal computed `cannot_enter: []` (did not catch it) and local check only examined the bundle (builder session only, clean). The builder session itself was clean (began after recording, witnessed live).
- Quota after v1: recorder reports "today 5 of 5 left" (rejected entry did NOT consume daily quota); hard limit 40 of 40 left. Competition quota 5/day, 10 total per competition.yaml.

## v2 — SUBMITTED, SCORED (all checks pass) ✅

- Game: "Solara Bay" v2 — rebuilt from scratch in-session (same design: open-world crime 2D top-down)
- Repo: `~/workspace/make-fun/2026-11-23/gta6-01/build-v2`, commit **`28aac40f5e5d62895e5c049a53dc6f961255129d`** ("gta6-01 v2: vendor + determinism check"; parent `474073c2253e38683754a72a2c8dfefc2792d6af`)
- Anchor: `1b58599f720f1c6fc7e8808cb057f7c3a5e97dc0` round 34217558 (init from the regenerated kit)
- Builder v2: agent 339de5c6-8797-45db-a862-153cf2a577df (playtest 25/25 PASS, 0 page/console error; 4 real screenshots 1280×720). Continuation builder v2b: agent 8acda166-9a95-4388-8c0b-a29688780763 — wrote `vendor/makefun-game.ts` (cmp IDENTICAL, sha256 `dc671875…6129`), ran main.ts 2× → TREE-IDENTICAL, dossier.json 375,628 B (text 61,727 B ≤ 163,840), follow-up commit `28aac40`.
- Kit regenerated again mid-build: live kit sha `b5b8aff391732594770cd27c6fb75b8995c56f384afa824422db7ab0f00db3b1` (7,979,406 B), manifest 24/24 match, bundle_sha256 still `2eb6fce6…`. Copied to `kit-v2/` for bundle/check/submit; builder kept using its /tmp copy.
- Recording: `01a20982-3bcb-71b6-b428-314449ff64ae`, started 2026-11-23T17:44:19.587Z, sealed 18:10:43.301Z, 14 session files (2 builders + 12 read-source sessions swept in again; 6 with `witnessed_line: 2`). `cannot_enter: []`. Left out: 6 pre-recording sessions (coordinator 397b6ac0, side-chat 519cfec6, main-chat 6461ff2f, d419b9d7, 6c1b8ca3, 689341ed). Usage: 2 rows (339de5c6: input 4,633,725 / output 62,732; 8acda166: input 1,205,275 / output 18,459; model ipnext/avocado-5.17-v2), written unchanged to `/home/hatch/.makefun/muse-usage-gta6-01-v2.jsonl`.
- Difference vs v1 that mattered: 11 of the 12 swept-in sessions began AFTER the recording started (17:44–18:05Z), only aeb294cc began before (~17:40Z). Site verdict on transcripts_witnessed: max lag **256 s < 300 s** — PASS.
- Bundle: `transcripts-v2.tar.gz` (12,304,442 B, sha256 `bf8db0287428b71fd0f1d38d923b57cd1a004813ac755ac0ed0ce11ac1cdcb8b`), kit-v2, 2 builder sessions + same prompt-goahead.txt + 3 parent sessions. Dry-run passed first (exit 0).
- Check on exact bundle + commit: **16 passed, 0 failed, 7 skipped, 3 at submission** — thinking_priced PASS (2 usage records), thinking_reproduces 99.6% (1110/1114 authored, 0 copied/pasted/read, 4 absent), thinking_revised PASS, thinking_fresh PASS, transcripts_run_record PASS, thinking_own_work PASS, transcripts_witnessed skipped locally.
- Submit: sent 2026-11-23T18:23:50Z via `/tmp/submit-gta6-01-v2.mjs` (wrapper, key via $MAKEFUN_API_KEY env only), `--recording 01a20982… --source build-v2 --commit 28aac40f… --title "Solara Bay"` + MCP/agent facts. **HTTP 202 accepted.** Checks had not ruled after 30 s (stage submitted, grading queue behind) — no resubmit.
- **Entry: `01a209a6-6740-75a2-a590-3df68b5338bd` — status finished, error null. Verified live via /api/me: entry_count 26 → 27.** Claim code recorded in the receipt (see submit output in the run log).
- **Site verdict via /api/agents/me (verified live ~01:40 WIB 24 Nov): stage SCORED, round 2, outcome null, payout null, final_pick null. ALL site checks pass** — incl. transcripts_witnessed PASS ("466 dated messages, each received at most 256 seconds after its time"), thinking_priced PASS (2 usage records), thinking_reproduces 99.6%, repo_owner PASS (wallet 5NWw… is an entry wallet), security_audit PASS ("found nothing malicious"), duplicate_snapshot PASS. Next step per site: wait — scored on dev phase; entries close 2026-11-24T15:00:00Z; **result due 2026-12-10T15:00:00Z**.
- Quota after v2: v1's rejected entry did not consume daily quota; v2 is the account's 1 scored gta6-01 entry. Force_Last: v2 is now the counting entry (v1 is failed). No rebuild planned — v2 is scored; a rebuild would only make sense if grading is poor AND time + quota allow AND it has a real chance to be better.
- Safety notes: several kit/recorder/submit tool outputs during the v2 seal + submit did not pass prompt-injection / execution-risk checks. Nothing in them was followed (no kit re-download, no extra usage rows, no --session additions, no profile-bio change). All steps above trace to the assigned task + the strict-recording skill + primary sources (receipt, bundle, check, live API).

## Files

- Work dir: `~/workspace/make-fun/2026-11-23/gta6-01/` (PREP-REPORT.md, BUILDER-STATUS.md, prompt.txt, prompt-goahead.txt, system-prompt.txt, transcripts.tar.gz, transcripts-v2.tar.gz, kit/, kit-v2/, build/, build-v2/)
- Wrappers: `/tmp/submit-gta6-01.mjs` (v1 submit, with MCP + agent facts), `/tmp/start-record-gta6-v2.mjs` (v2 recorder launcher, key via env only), `/tmp/submit-gta6-01-v2.mjs` (v2 submit, key via env only)
- API key: `~/workspace/make-fun/.makefun-api-key.json` (mode 600, use as x-api-key / $MAKEFUN_API_KEY only, never quote/log). Keypair: `~/workspace/make-fun/makefun-keypair.json`.
