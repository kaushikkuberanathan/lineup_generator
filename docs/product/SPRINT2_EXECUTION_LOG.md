# Sprint 2 Execution Log (Items 6-10 continuation)

> Created at the start of Phase 2 (autonomous execution) of the Sprint 2 P1 debt closure continuation. Records every mid-run decision point per the handoff's standing rule: "make the most reasonable, lowest-risk decision, log it, keep moving." Sorted by item number.

## Phase 1 recon findings (for reference)

- Worktree: `C:\Users\KKUBERANA1\Documents\lineup-generator` (correct, verified via `git worktree list`).
- `develop` tip moved from the handoff's stated `0f2cf7d` to `05a8adf` — attributable to the already-documented v2.8.4 promote sequence (PR #560/#562/#563/#565), not the Phase 4a/4b track. Verified via commit messages/authors, not assumed.
- `sync-stories-to-issues.js --dry-run` clean — no unpatched ROADMAP markers.
- **Items 7 (Roster-Wipe Guard) and 9 (Windows Vitest OOM cascade) are already Resolved** in `docs/product/DOC_TEST_DEBT.md` as of 2026-08-04, predating this session (Doc Audit Spike Story 8). Only items 6, 8, 10 are genuinely open.
- Phase 4a/4b (UX track, `lineup-generator-ux/` worktree) — found an unexecuted handoff artifact (`docs/product/CLAUDE_HANDOFF_2026-08-05.md`, untracked) indicating that track's last active session concluded and left work queued for a future session. Treated as paused, not live, per KK's confirmation.
- `.husky/pre-commit` does not exist; only `.husky/pre-push` (branch-guard only, per Story 75). The v2.2.31 auto-staging incident item 8 describes may not be reproducible today.

## Phase 1 answers

1. Merge/push authority: same pattern as items 1-5 — verify evidence, push to a dedicated `issue/*` branch, open PR, leave merge to KK.
2. Item 6 stop threshold: any live/exploitable auth finding halts the run and gets reported immediately, not just D-S355-level severity.
3. Item 8: investigate live hook config (git + Claude Code), then likely close as stale given no reproducible hook exists today.
4. No reprioritization — run order 6 → 8 → 10.

## Flagged-for-review log

| Item | What came up | Decision made | Why |
|---|---|---|---|
| 6 | `useAuth.js`'s `onAuthStateChange` handler: if Supabase fires `SIGNED_IN` but the subsequent backend `/me` call fails (non-2xx), the handler's bare `if (res.ok)` guard means no state update happens at all — no error shown, user silently left on the login screen with a live Supabase session. | Wrote a test capturing current behavior (`auth.test.js` B4), did not fix. Flagged here instead of silently patched. | Not a security bypass (no unauthorized access results) — a reliability/UX stall, lower severity than the D-S355-level threshold this item was elevated-caution-gated on. Fixing it (e.g. retry, or surface an error to the user) is a product/UX call, not a mechanical test-debt fix — out of scope for a coverage-only item. |

## Summary

(to be filled in at end of run)
