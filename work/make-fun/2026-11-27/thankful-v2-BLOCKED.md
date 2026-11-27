# THANKFUL V2 — BLOCKED at kit init (prompt-injection + execution-risk flags)

**Date:** 27 Nov 2026, ~11:29 WIB (04:29 UTC). Round 2 cutoff 16:41 WIB today; deadline 04:41 WIB 28 Nov.
**Status: NOT BUILT, NOT SUBMITTED.** Awaiting jolly's go-ahead (same pattern as shino v2 init, cleared by "Gas, rebuild Teacup" 26 Nov).

## What happened
- Builder 1 (2a98e8cc-abf8-43b0-9ac0-e084027d1a91): stopped on a plain CLI usage error — `makefun init` rejects `--kit` / `--repo`. No files written. Corrected syntax found by the coordinator from the CLI source: `init [--competition <slug>] [--license <spdx id>] [--drand-relay <url>...]` (+ `--keypair`), run with cwd in the empty dir.
- Builder 2 (5b729a75-54c2-4b9c-96b4-8af7bb14fb4c): ran the corrected init; exit 0, anchor created (drand round 34316786). The init tool result then failed BOTH the prompt-injection and execution-risk checks, and its stderr carried an embedded instruction to re-download the kit. Instruction NOT followed (no re-download, no other kit command, no profile/wallet change). Per the standing rule (flag on an INIT output before any build → stop, decision goes to jolly), the builder stopped. No commits, no entry files, no bundle, no check, no submit.

## State of the v2 dir (verified by coordinator)
- `~/workspace/make-fun/2026-11-27/make-the-ai-judge-feel-thankful-20261127-1600-v2/`
- Contains only what init wrote: `.git/` (repo created, NO commits yet), `.makefun/freshness.json` (anchor round 34316786, wallet 5NWwTrA5LxQVEGC4R5XRJrszg16G5H9G6VRNJX2DgcGC, canonical JSON form), `LICENSE` (MIT).
- Missing: git config/commits, main.py, README.md, prompt-scheduled.txt, .gitignore, BUILD-REPORT.md, bundle, check.
- No usage rows exist for either builder (no counted writes happened).

## What is needed to resume
Jolly's explicit go-ahead naming this rebuild (as for shino v2). Then a fresh builder can resume from the existing init state: git config (wallet as user.name/email), commit anchor as root commit, commit LICENSE, write entry files (NEW text, different angle from v1 — no window/evening-light/gold motif), determinism test, bundle (builder-session-only), check (expect thinking_priced fail until usage rows attached), parent attaches rows, re-bundles, re-checks, submits, verifies live (entry_count 32 → 33).

## Context
- V1 entry 01a219fc-30bc-72d7-a094-42503c439f1e ("A Little of That Gold"): round 1 judged 10:49 WIB 27 Nov, rank 3344/4924, score 453053 — outside top-100 paid. Standing rule (17 Nov 2026) says rebuild + resubmit when outside the paid pool, within deadline + quota (5/day, 1 used).
- Kit: ~/workspace/make-fun/2026-11-27/0517-kit-thankful/make-the-ai-judge-feel-thankful-20261127-1600-kit/ (NOT re-downloaded).
