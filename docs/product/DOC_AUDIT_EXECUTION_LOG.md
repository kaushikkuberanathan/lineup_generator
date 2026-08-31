# Doc Audit Execution Log

> **Historical execution log.** This records the 2026-08-04 remediation run and must not be used as the current production baseline; see Stories 334-340 in `ROADMAP.md`.

> Created at the start of Phase 2 (autonomous execution) of the Doc Audit Spike remediation run. Records every mid-run decision point per the handoff's standing rule: "make the most reasonable, lowest-risk decision, log it, keep moving." Sorted by story number.

## Phase 1 answers (for reference)

- Worktree: T1 (`C:\Users\KKUBERANA1\Documents\lineup-generator`)
- v2.8.4 promote status: **not promoted** — main confirmed at v2.8.3 (`origin/main` APP_VERSION). Story 7 skipped entirely per its own gating rule.
- Schema verification: KK ran the live SQL query directly (RLS enabled/forced state, pg_policies, team_memberships CHECK constraint, anon/authenticated grants on team_data/teams/roster_snapshots) and pasted results. Used as ground truth for Story 1.
- Branch: rebased `feature/docs-product-audit-spike` onto `origin/develop` (was 2 commits behind, one touching ROADMAP.md) before starting.
- Merge authority: autonomous squash-merge of each `issue/[N]-slug` branch into `feature/docs-product-audit-spike`; final `feature/* -> develop` merge held open as a PR for KK's explicit review.
- CLAUDE.md gate phrase: granted ("all clear — CLAUDE.md editing approved") — applies to Story 9's Phase-4-disambiguation note only (Story 7, the only other CLAUDE.md-touching story, was skipped).
- Push authorization: granted ("confirmed — push to feature/docs-product-audit-spike and its issue branches").
- Systemic Issue #1 checklist wording: confirmed as proposed — but not applied because it was scoped to Story 7, which is skipped. **FLAGGED FOR KK REVIEW**: consider applying this checklist item independently of Story 7/the v2.8.4 promotion, since it's a general process fix, not v2.8.4-specific.

## Live security finding surfaced before Phase 2 (out of scope for this docs-only run)

The live `pg_policies` query KK ran shows `allow_scorer_writes` (`roles: public`, `cmd: ALL`, `qual: true`, `with_check: true`) on all three live-scoring tables (`live_game_state`, `game_scoring_sessions`, `scoring_audit_log`) — this permits **unauthenticated read/write/delete on any team's live scoring data**, platform-wide, not just the two team IDs the narrower `*_anon_test` policies scope to. This is broader/worse than `AUTH_SECURITY_AUDIT_ROADMAP.md`'s existing "#355 — four backdoors, Mud Hens only" framing. Documented precisely in Stories 2 and 9 below. **The actual RLS policy fix is out of scope for this run and was not attempted** — flagged to KK directly in chat before Phase 2 began; this log entry is the durable record.

## Flagged-for-review log

| Story | What came up | Decision made | Why |
|---|---|---|---|
| 3 | ONBOARDING.md's old Step 2 treated "Create New Team" as the first-time-coach flow. Investigating `App.jsx`, `createTeam()` (line ~2387) only writes to the local `teams` array + `dbSaveTeams()` - it never inserts a `team_memberships` row. Root CLAUDE.md states "Phase 4 MVP: platform_admin manually creates teams in Supabase," and the auth-gate render logic only reaches the "Create New Team" button after `authState` has already resolved past `no_membership` (i.e. the user already has ≥1 active membership somewhere). This strongly suggests a genuinely first-time coach (zero memberships) cannot reach "Create New Team" at all - the `no_membership` branch only offers Request Access. | Rewrote ONBOARDING.md's flow so Request Access → platform_admin approval is the primary first-time-coach path, and reframed "Create New Team" as a secondary action for a coach who already has ≥1 team adding another. Did not attempt to verify or fix whether `createTeam()` correctly provisions a `team_memberships` row for that secondary case - that's an app-code question, out of scope for a docs-only pass. **FLAGGED FOR KK REVIEW.** | Lowest-risk read: the doc should describe the flow CLAUDE.md itself documents as the current model, not assume an unverified self-serve path works end-to-end. If `createTeam()` for an existing coach's *additional* team also doesn't grant a membership row, that's a real app bug worth its own investigation - separate from this remediation run. |
| 9 | Spike's suggested fix for LINT_BASELINE.md offered a choice: archive with a final "Resolved" entry, or delete the file and fold one paragraph into DOC_TEST_DEBT.md/CLAUDE.md instead. | Archived in place (added a resolved-banner at the top, kept the full historical baseline data below it) rather than deleting. | Matches the same pattern already used for DESIGN_AUDIT.md §B.1 and §A.1 in this same story (correction banner + kept-as-history), for consistency across the batch. Deleting is a harder-to-reverse action than archiving, and the detailed per-file/per-rule breakdown has some archival value if anyone ever wants to compare against a future lint-debt baseline. |

## Summary

8 of 9 stories executed (Story 7 skipped per its own gating rule — v2.8.4 not yet promoted to main). 2 genuine mid-run judgment calls, both logged above, neither blocking. 1 real security finding surfaced and escalated directly rather than folded quietly into a commit (see section above). All work is docs-only; zero application code touched. Final state: `feature/docs-product-audit-spike` pushed, PR #559 opened against `develop`, not merged — held for KK's review per the granted merge-authority split.
