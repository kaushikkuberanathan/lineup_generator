# Story 133 slices 5-13 — sandbox branch handoff

> **Archived sandbox handoff.** Commands, branch names, counts, and pending steps are point-in-time evidence, not the current execution plan.

You are executing one slice of Story 133 (umbrella [#698](https://github.com/kaushikkuberanathan/lineup_generator/issues/698)) — migrating `frontend/src/components/game-mode/*` and `frontend/src/components/ScoringMode/*` off literal hex/rgba colors onto `tokens.js`. Slices 1-4 are already merged to `develop` (72/384 occurrences). You are working on one of slices 5-13 (312 occurrences remaining), told to you in your task prompt.

## THE ONE RULE THAT OVERRIDES EVERYTHING ELSE

**Every commit, every PR, every merge you make targets `feature/story133-slices5-13-sandbox` and ONLY that branch. Nothing you do may reach `develop`, `main`, or production, directly or indirectly, for any reason.**

- Never `git push` to `develop` or `main`.
- Any sub-branch you cut is based on `feature/story133-slices5-13-sandbox`, not `develop`. Any PR you open has **base = `feature/story133-slices5-13-sandbox`**, never `develop`.
- Never `git merge`/`git rebase` this branch or any child of it into `develop` or `main`.
- CI does **not** run on this branch or PRs into it (confirmed: `.github/workflows/ci.yml` only triggers on push/PR to `main`/`develop`). Your local `npm run build` + test runs are the only verification gate — there is no CI safety net here, be rigorous about running them yourself.
- If you're about to run any git command targeting `develop`, `main`, `origin/develop`, or `origin/main` — stop and re-read this section.

This branch exists so slices 5-13 can proceed without stopping between each one for KK's live approval (the gate that governed slices 1-4, because those landed on the real `develop`). That gate is lifted here. Proceed through your assigned slice(s) to completion without stopping, subject to the escalation policy below.

## Environment

- Worktree: `C:\Users\kaush\release-worktrees\story133-slices5-13` — already on `feature/story133-slices5-13-sandbox`, deps installed (`node_modules` present at root, `backend/`, `frontend/`), husky wrapper present, env files copied in.
- Do not touch `lineup_generator` or `lineup-generator-ux` — both are separate active worktrees other sessions may be using.

## Required reading

`docs/product/STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md` — still the source of truth for slices 1-4's proven method. Everything in it applies **except**:
- Its "push, open PR against `develop`" instruction — base is this sandbox branch instead, always.
- Its "stop, do not start the next slice until KK explicitly says to" — lifted, per the policy below.
- Its per-slice "wait for explicit approval before editing tokens.js" step — there is no live approval available. See "Design-token judgment calls" below for what replaces it.

**Gate phrases pre-granted for this entire task, by KK directly, in writing:** `"all clear — game-mode editing approved"` and `"all clear — ScoringMode editing approved"`. Do not ask for these again.

**The auth-testing boundary still applies, unchanged, regardless of branch.** Do not complete a real magic-link or Google-OAuth login flow, including via the Supabase service-role admin API to mint a session — not even to test something that seems low-risk. This governs how you interact with real Supabase auth and real email addresses; it has nothing to do with which git branch you're on. Use zero-auth verification instead:
- Share-link routes need no auth: `?share=<base64>&view=true` sits above the auth gate (see `frontend/src/utils/buildSharePayload.js` for the payload shape).
- Coach-only components: render via React Testing Library (or a throwaway Vite harness) and read back computed inline-style values off the real DOM — **this is only valid evidence for colors/styles.** A prior session made the mistake of treating a standalone render with no-op stub callbacks (`onSwap={function(){}}`) as if it validated real interaction wiring — it didn't, and KK caught it. If you build a harness to verify interaction behavior (a swap actually swapping, a dismiss actually dismissing), the harness must wire real handlers that mutate real state and assert on the result — a stub that does nothing proves nothing about behavior, only about how the component looks. If a component's real behavior genuinely can't be exercised this way, say so plainly in the checkpoint and move on — don't claim it's verified when it isn't.

## Design-token judgment calls (KK's explicit instruction for this run)

For any literal color that is NOT an exact match to an existing token: use your best judgment, following the precedent slices 1-4 already established (e.g. slice 4's reasoning — `color.gameDay.quickSwap.position.{bench,unassigned,fallback}` were minted as dedicated tokens rather than aliased to `gameDay.text.caption`/`diamond.position.fallback` despite matching bytes, because the *role* differs: position-accent swatch vs. text/diamond-SVG fill). Never silently alias a light-surface token (`text.secondary`, `border.default`, etc.) onto a dark game-day surface just because the hex happens to match.

Proceed without waiting for approval, but **document every non-trivial mapping decision and your reasoning** in this slice's section of `docs/product/STORY133_SANDBOX_PROGRESS.md` (see below) — KK will review all of it in the morning and can correct anything. Nothing here touches `develop`/prod, so a wrong call is cheap to fix; an undocumented one is not, because no one will know to look for it.

## Escalation policy — when to stop vs. keep going

**Keep going, log it, move on:** ambiguous design-token calls (see above), a component turning out different than the doc described, a test file dropping from the count on one run (this is the documented Bug #7 Windows Vitest worker cold-start flake — retry once with `npx vitest run --no-file-parallelism` before treating it as a real failure; see root `CLAUDE.md` → Infrastructure notes), minor build warnings that don't fail the build.

**Stop the whole chain and report back clearly, don't guess further:** anything that risks touching `develop`/`main`, `npm install`/`npm run build` broken in a way retrying doesn't fix, `git push` failing outright, or genuine confusion about which file/component you're even looking at.

## Scope

**`game-mode/*` track** (gate: `"all clear — game-mode editing approved"`):

| Slice | File | Occurrences | Notes |
|---|---|---|---|
| 5 | `GameModeScreen.jsx` | 33 | Original ticketed file. Reached via 3 "Game Mode" buttons on ready team cards, Home tab. |
| 6 | `InningModal.jsx` | 45 | Largest in this track, sequenced last on purpose. |

**`ScoringMode/*` track** (separate gate: `"all clear — ScoringMode editing approved"`):

| Slice | File | Occurrences | Notes |
|---|---|---|---|
| 7 | `LiveScoreViewer.jsx` | 0 | Verification-only — confirm genuinely clean, not a real migration. |
| 8 | `GameModeGearMenu.jsx` | 10 | |
| 9 | `RunnerConflictModal.jsx` | 12 | |
| 10 | `RestoreScoreModal.jsx` | 15 | |
| 11 | `FinishGameModal.jsx` | 16 | |
| 12 | `ScoringModeEntry.jsx` | 31 | |
| 13 | `LiveScoringPanel.jsx` | 167 | ~60KB. **In scope for tonight** (KK's explicit call). Sub-slice into 2-3 PRs by logical section — don't attempt one giant diff. |

## Per-slice workflow

1. Confirm branch: `git branch --show-current` in the worktree.
2. Cut the slice branch from the sandbox branch:
   ```
   git fetch origin feature/story133-slices5-13-sandbox
   git checkout -b feature/story133-sliceN-<component>-token-migration origin/feature/story133-slices5-13-sandbox
   ```
3. Inventory: `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" <file> | sort | uniq -c | sort -rn`
4. Decide the mapping for every value (see judgment-calls section above). Write `tokens.js` first, then the component.
5. Verify zero literals remain: `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" <file>` → must be empty.
6. `cd frontend && npm run build` must be clean. Run the file's own test if one exists, `src/tests/theme.tokens.test.js`, and the broader `src/components/game-mode/` suite (114/114 was the slice-3 baseline).
7. Commit — no `closes #698`/`fixes #698` in any commit message, ever.
8. Push, open PR with **base = `feature/story133-slices5-13-sandbox`**. Note in the PR body that this is sandbox work, not a promotion candidate. Label: `priority:p2`, `type:refactor`, `area:game-mode` (or `area:scoring`).
9. Merge into the sandbox branch. Verify a real 2-parent merge: `git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`.
10. Append a checkpoint section to `docs/product/STORY133_SANDBOX_PROGRESS.md` (create it if this is the first slice) — same evidentiary bar as slice 3/4's real checkpoints (computed values quoted exactly, not "looks right"). Do not post to GitHub `#698` — comment-write access was failing (403) as of this handoff.
11. Report back a structured summary in your final response: slice number, file(s), occurrence count, build/test result, real-merge confirmation, and a one-line pointer to what you logged in the progress doc.

## What "done" looks like

Your assigned slice(s) merged into `feature/story133-slices5-13-sandbox` as genuine 2-parent merges, zero literal colors remaining in the file(s), build+tests green, checkpoint logged. Stop there — do not open a PR from the sandbox branch into `develop`, do not suggest it. That decision is KK's alone, made separately later.
