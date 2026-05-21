# Session Retrospectives — Dugout Lineup

> Living log of session-by-session work, decisions, and operational learnings.
> Most recent at the top.
> Owner: KK. Updated at close of every working session.
>
> **Identifier format:** `YYYY-MM-DD-[A/B/C...]`
> Multiple sessions on the same date get sequential letter suffixes (A = first, B = second, etc.).
> Reference sessions as e.g. "2026-05-19-B" in commit messages, PRs, and ROADMAP entries.

---

## 2026-05-21-A — v2.5.17 + v2.5.18 double-bump, Story 75 hook fix, sync-script hardening, lint debt filed

**Date:** May 21, 2026
**Session ID:** 2026-05-21-A (Terminal 1)
**Duration:** ~6 hours (with breaks)
**Versions shipped to develop:** v2.5.17, v2.5.18 (main still at v2.5.16 — promotion pending)
**PRs merged:** #149 (v2.5.17 bump), #155 (Story 75 hook fix), #156 (sync-script hardening), #157 (v2.5.18 bump)
**Issues filed:** Story 77 (P2)
**Stories closed:** Story 75 (P1) — resolved v2.5.18

---

### Starting State

**Main worktree** (`C:\Users\KKUBERANA1\Documents\lineup-generator`)
- Branch: `chore/backend-route-modularization` (from prior session 2026-05-20-A)
- HEAD: `d948914` — retrospective commit
- Version: v2.5.16
- Tree: dirty — 2 uncommitted edits (test count 734 → 740 in CLAUDE.md + frontend/CLAUDE.md) + 2 unpushed commits (Story 75 ROADMAP, retrospective)

**UX worktree** (`C:\Users\KKUBERANA1\Documents\lineup-generator-ux`)
- State unknown at session open; later discovered to be on `fix/sync-script-and-issue-markers` then `feature/ux-tokens-lineheight`

**Production (`main`):** v2.5.16

---

### Ending State

**Main worktree**
- Branch: `docs/session-retrospective-2026-05-21-A` (cut from origin/develop for this file)
- Bump branches cleaned up: `chore/version-bump-v2.5.17`, `fix/story-75-pre-push-hook`, `chore/version-bump-v2.5.18` all deleted

**UX worktree**
- Branch: `feature/ux-tokens-lineheight`
- HEAD: `10d5222` (v2.5.18 squash merge)
- Tree: clean

**Production (`main`):** v2.5.16 — unchanged. Develop holds both v2.5.17 and v2.5.18, pending promotion.

---

### What We Did

| # | Work Item | Outcome |
|---|---|---|
| 1 | v2.5.17 bump composed from 9 PRs since v2.5.16 | PR #149 merged (squash) |
| 2 | Story 75 — pre-push hook remediation (Bug #7 mitigation) | PR #155 merged — removed Vitest + lint, kept branch guard + skip-on-deletion, added explicit `exit 0` |
| 3 | sync-stories-to-issues.js hardening (KK's morning work on UX worktree) | PR #156 merged — placeholder strip, word-boundary regex, metachar escape |
| 4 | Story 77 (P2) filed — 132 ESLint problems block strict lint gate | ROADMAP entry, `no-undef` errors flagged as potential real bugs |
| 5 | v2.5.18 bump carrying Story 75 + #156 + Story 77 filing | PR #157 merged (squash) |

---

### Issues Faced

**Issue 1 — Hook exit 0 gotcha (~5 min)**
When removing the Vitest run from `.husky/pre-push`, the last executable line `[ "$HAS_CONTENT_PUSH" = "0" ] && exit 0` evaluated false for content pushes (the common case), making the script exit 1 and block every push. The old hook hid this because `cd frontend && npm test` ran after and overrode the trailing exit status.
- Caught on the very first push attempt (good — bug surfaced immediately)
- Fix: append explicit `exit 0` at end of file
- Prevention: bash scripts that should always succeed at the end must end with explicit `exit 0`, never with a conditional test

**Issue 2 — Lint gate not viable (~20 min replan)**
Story 75's Option A was "keep lint/tsc only". `npm run lint` revealed **132 existing ESLint problems** (45 errors, 87 warnings) under `--max-warnings 0`. tsc not viable either (no tsconfig; codebase is pure JSX). Hook reduced to branch-guard + skip-on-deletion only.
- 3 `no-undef` errors flagged for triage: `supabase` (App.jsx ~2821, 2849), `teamName` (~2941–2959), `updateServiceWorker` (~3517, 8632)
- Story 77 (P2) filed for systematic triage
- Prevention: run the gate command once before designing for it — a 30-second `npm run lint` at the start of Story 75 planning would have surfaced this immediately

**Issue 3 — Worktree owns-branch conflict on develop pull (recurring)**
Tried `git checkout develop && git pull` in main worktree. Failed with "develop already used by worktree at lineup-generator-ux". Resolution: switch main worktree to main, run pull in UX worktree directly via `git -C` path.
- Hit again later when UX worktree was on a feature branch instead of develop — pull created an unintended merge commit
- Prevention: `git branch --show-current` on any worktree before `git pull origin <branch>`. KK's two worktree split means develop lives in the UX worktree; main worktree should never expect to own it.

**Issue 4 — UX worktree on non-develop branch created accidental merge (~5 min recovery)**
After PR #149 merged, ran `git pull origin develop` in UX worktree expecting fast-forward. UX worktree was on `fix/sync-script-and-issue-markers` (KK's overnight work) — pull created merge commit `28a16fd`. Recovered via `git reset --hard 01a5cff` (KK explicitly approved the destructive command). The sync-script work was real and shipped as PR #156 on its own merit.
- Lesson: always verify current branch before pulling another branch into it

**Issue 5 — Edit tool stale-file errors after branch checkout (~10 min)**
Several Edit calls during the v2.5.18 bump failed with "File has been modified since read". Branch checkout refreshed the tool's file tracking for files not directly edited by the checkout. Re-Read before Edit resolved.
- Pattern: treat `git checkout` as a state reset for Edit tool tracking. After switching branches, any file you intend to Edit needs a fresh Read first.

**Issue 6 — App.jsx skip-worktree re-lock timing (Bug #11 recurrence)**
Re-locked App.jsx BEFORE committing the v2.5.17 bump. `git diff` and `git status` then showed no changes despite the edit being on disk. Recognized the trap quickly (covered in CLAUDE.md Known Bugs row 11), unlocked, staged, committed, then re-locked.
- Rule confirmed: edit → unlock-stage-commit → re-lock → push. Never re-lock between edit and commit.

**Issue 7 — Bash tool can't run PowerShell cmdlets (~1 min)**
`Remove-Item` failed via Bash tool because Bash invokes `/usr/bin/bash`, not PowerShell. Used PowerShell tool directly for cleanup.
- Covered in existing memory `feedback_cmd_tail_fails_use_powershell.md`

---

### What Was Accomplished

- ✅ v2.5.17 shipped to develop (PR #149) — composed entry from 9 accumulated PRs (#139, #142–#148)
- ✅ Story 75 (P1) resolved — pre-push hook reduced to branch-guard + skip-on-deletion + explicit exit 0 (PR #155)
- ✅ Story 75 fix validated end-to-end — v2.5.18 push succeeded **without `--no-verify`** on main worktree
- ✅ sync-stories-to-issues.js hardened (PR #156) — Fix A placeholder strip, Fix B word-boundary regex, metachar escape
- ✅ Stories 72–76 ROADMAP markers updated from `<!-- #N -->` to real issue numbers `#150–#154`
- ✅ Story 77 (P2) filed — lint debt triage; `no-undef` errors on `supabase`, `teamName`, `updateServiceWorker` flagged as potential real bugs
- ✅ v2.5.18 shipped to develop (PR #157)
- ✅ Both worktrees clean and synced at session close
- ✅ All bump branches cleaned up locally

---

### Key Decisions Made (and Why)

**Empty post-guard portion of pre-push hook.**
Option A from Story 75 originally read "keep lint/tsc only" — collapsed to branch-guard-only when lint had 132 existing failures. Chose honest-minimal hook over either ignoring the lint debt or shipping a hook that fails every push.

**New commit (not amend) for exit 0 fix.**
Followed global no-amend rule even though the broken commit was unpushed. PR squash collapsed both commits on merge anyway.

**No `--no-verify` on v2.5.18 push.**
First validation of Story 75's fix on the main worktree. Push succeeded cleanly — confirms the new hook works as intended.

**Cherry-pick prior session's carry-forward onto bump branches.**
v2.5.17 carried Story 75 ROADMAP + retrospective 2026-05-20-A from `chore/backend-route-modularization` via cherry-pick. v2.5.18 carried Story 77 filing in its bump commit. Pattern: prior-session work that didn't ship gets folded into the next bump.

**Refresh test count "as of" date on v2.5.18.**
Count itself unchanged (740/1) but the "as of v2.5.16, May 20" reference was stale. Updated to "as of v2.5.18, May 21" since PR #156 confirmed the count holds. Rule: the "as of" reference tracks the latest release that ran the suite cleanly, not the last release where the count changed.

---

### What We Could Have Done Better

1. **Run the lint command once before designing the lint gate.** A 30-second `npm run lint` at the start of Story 75 planning would have surfaced the 132-issue debt immediately. Cost: ~20 min of replan + rewrite.

2. **`git branch --show-current` reflex before any worktree pull.** The owns-branch conflict + accidental merge both trace to this. Make it part of session-open and session-mid checks on both worktrees.

3. **Treat `git checkout` as Edit-tool tracking reset.** After any branch switch, plan to re-Read files before batched Edits. Saved retries during v2.5.18 bump.

4. **Bash scripts with conditional final statements need explicit `exit 0`.** Hook exit 0 bug caught immediately, but a one-line lint rule (shellcheck) would catch this class permanently. Worth filing? Maybe — only if other shell scripts grow in the repo.

---

### Carry-Forward Items

| Priority | Item | Notes |
|---|---|---|
| P1 | Promote v2.5.17 + v2.5.18 to main | Both on develop. Soak + Ship Gate + Pre-release Docs Checklist + Vercel preview phone-smoke test. Coach-facing changes: none (governance only). |
| P2 | Story 77 — Lint debt triage | 132 ESLint problems. Recommended: fix 3 `no-undef` errors first (potential real bugs), ~15 min. Then errors, then warnings. |
| P2 | Story 72 — adminRouter/feedbackRouter specific prefixes | Bundle with Phase 4C cutover |
| P2 | Story 71 — Version history audit | Standardize schema across all entries |
| P3 | Story 76 — `\r` artifacts in ROADMAP headings | Cleanup pass when convenient |
| — | UX track | `feature/ux-tokens-lineheight` open in UX worktree at HEAD=10d5222 |

---

### Next Session Open Checklist

- [ ] `git status` and `git branch --show-current` on both worktrees before any work
- [ ] Confirm v2.5.17 + v2.5.18 still un-promoted to main (or trigger promotion)
- [ ] If promoting bundle to main: open Ship Gate, run Pre-release Docs Checklist, Vercel preview phone-smoke
- [ ] If continuing dev: cut new feature/fix branch from origin/develop in main worktree
- [ ] Story 77 triage if time allows — start with `no-undef` errors

---

## 2026-05-20-A — Backend scalability assessment, CLAUDE.md trim, route modularization, Bug #7 escalation

**Date:** May 20, 2026
**Session ID:** 2026-05-20-A (Terminal 1)
**Duration:** ~4 hours
**Version shipped:** None (v2.5.16 current; v2.5.17 bump pending)
**PRs merged:** #145 (chore/backend-route-modularization → develop)
**Issues filed:** Story 72 (P2), Story 75 (P1)
**Stories closed:** None (Story 61 confirmed already shipped via PR #103)

---

### Starting State

**Main worktree:** `C:\Users\KKUBERANA1\Documents\lineup-generator`
- Branch: `docs/story-70-71-roadmap` (mid-CLAUDE.md trim from prior session)
- HEAD: `b63af84` — docs: extract Phase 4C cutover checklist (step 2/3 of trim)
- Version: v2.5.16
- Tree: clean
- Context: CLAUDE.md trim in progress (2 of 3 extractions committed, step 3 pending); local main stale by 57 commits

**Production:** dugoutlineup.com — v2.5.16, share-link routing confirmed shipped (Story 61 via PR #103)

---

### Ending State

**Main worktree:** `C:\Users\KKUBERANA1\Documents\lineup-generator`
- Branch: `chore/backend-route-modularization` (pushed, PR #145 merged to develop)
- HEAD: `3bd7cd5` — Merge remote-tracking branch 'origin/develop' into chore/backend-route-modularization
- Version: v2.5.16 (no bump this session)
- Tree: dirty — 2 uncommitted files waiting for version bump batch:
  - `CLAUDE.md` (test count 734 → 740)
  - `frontend/CLAUDE.md` (test count 737 → 740)

**Production:** dugoutlineup.com — v2.5.16, unchanged

**Local branches at session end:**

| Branch | State | Notes |
|---|---|---|
| `main` | ✅ current with origin/main | Pulled during housekeeping (was 57 commits behind) |
| `develop` | ✅ PR #145 merged | chore/backend-route-modularization squash-merged |
| `chore/backend-route-modularization` | ✅ pushed, merged | Safe to delete after confirm |

**Branches deleted this session:**

| Branch | Reason |
|---|---|
| `fix/story-27-share-link-routing` | Stale label — contained no unique work; Story 61 already shipped via PR #103 |
| `docs/story-70-71-roadmap` | All 3 CLAUDE.md trim commits confirmed on develop; branch was a label only |

---

### What We Did

Session opened on the CLAUDE.md trim (Step 3 of 3 pending), pivoted to a backend scalability assessment, then worked through four items in priority order:

| # | Work Item | Outcome |
|---|---|---|
| 1 | CLAUDE.md trim — Step 3 (VERSION_HISTORY schema extraction) | Committed to docs/story-70-71-roadmap; confirmed already on develop |
| 2 | Backend + test coverage assessment | Identified 4 gaps: RLS off, test-against-prod, auth shims, index.js flat |
| 3 | Story 61 triage | Confirmed shipped to main via PR #103 — no work needed |
| 4 | Backend route modularization (PR #145) | New ops router, dual-mount teamData, mount reorder, /test-public deletion |

---

### Issues Faced

**Issue 1 — Bug #7 worker-timeout: 4 failures in 5 push attempts (~45 min wall time)**
Root cause: Vitest threads-pool worker handshake exceeds 60s on Cox managed Windows endpoint under memory pressure. Non-deterministic — different file fails each attempt (migration.test.js, FAQSection.test.jsx, a11y-component-fixes.test.jsx, Button.test.jsx).
Resolution: One successful push at 382s on attempt 4. Final push used `--no-verify` (merge commit + docs only; CI backstop).
Time cost: ~45 min cumulative.
Prevention: Story 75 logged — move full Vitest suite out of pre-push hook; keep only lint/tsc. CI is the authoritative gate.

**Issue 2 — Mount-order latent bug surfaced by new routes**
Root cause: `adminRouter` and `feedbackRouter` mounted at bare `/api/v1` intercept all unmatched `/api/v1/*` sibling paths via `router.use(requireAuth)`. New `/api/v1/ops` and `/api/v1/teams` routes returned 401 on first smoke test.
Resolution: Reordered mounts — specific paths before generic. Net zero lines changed; all routes resolved correctly on retry.
Time cost: ~20 min (recon + fix + re-smoke).
Prevention: Story 72 logged — re-mount admin/feedback at specific prefixes (`/api/v1/admin`, `/api/v1/feedback`) during Phase 4C cutover.

**Issue 3 — Story 27 vs Story 61 naming mismatch**
Root cause: Memory had `fix/story-27-share-link-routing` as the active fix branch; ROADMAP had renumbered the story to 61. Branch comparison showed "nothing to compare" on GitHub.
Resolution: Git recon confirmed Story 61 already shipped via PR #103. Branch deleted as stale label.
Time cost: ~10 min.
Prevention: When memory references a story number, verify against ROADMAP before any branch operations.

**Issue 4 — ROADMAP merge conflict from concurrent story additions**
Root cause: Story 72 (added on chore branch this session) and Stories 73–74 (added on develop via PR #144) both inserted entries at the same ROADMAP line position.
Resolution: Stash → merge → manual conflict resolution (keep both sides in numeric order) → stash pop → re-push.
Time cost: ~15 min.
Prevention: Add stories to ROADMAP at end of Backlog section, not mid-file, to reduce positional conflict probability.

**Issue 5 — Uncommitted working tree blocking merge operations (recurring)**
Root cause: Multiple instances of making edits without immediately committing (ROADMAP Story 72, test-count bumps) before running merge/checkout commands.
Resolution: Stash → merge → pop pattern. Worked cleanly both times.
Time cost: ~5 min per occurrence (×2).
Prevention: Commit or stash before any merge/checkout operation. Agent now proactively halts and asks — pattern is working.

**Issue 6 — cmd /c via Bash shim drops piped output (recurring)**
Root cause: Windows cmd.exe output doesn't pipe through the Bash shim cleanly. Affects `type`, `netstat | findstr`, and similar piped commands.
Resolution: Fall back to PowerShell (`Get-Content`, `Get-NetTCPConnection`) — consistent workaround.
Time cost: ~3 min per occurrence.
Prevention: Document in agent session prompt: always use PowerShell equivalents for file reads and network checks on Windows.

---

### What Was Accomplished

✅ CLAUDE.md trimmed from ~44.8k to ~35.4k chars (3 extractions, 3 commits) — confirmed on develop
✅ Local main synced (was 57 commits behind origin/main)
✅ Stale branches cleaned up (fix/story-27-share-link-routing, docs/story-70-71-roadmap)
✅ Story 61 (share-link routing) confirmed shipped to production — no action needed
✅ Backend scalability assessment completed — 4 gaps identified and prioritized
✅ `backend/src/routes/ops.js` created — `/api/v1/ops/ping` + `/api/v1/ops/health` with full parity to legacy handlers
✅ `teamDataRouter` dual-mounted at `/api/v1/teams` alongside legacy `/api/teams`
✅ Mount-order bug fixed — specific routes before generic `/api/v1` mounts
✅ `GET /test-public` deleted (zero callers confirmed)
✅ Backend tests: 71 passed / 0 failed / 13 skipped — all relevant regression tests green
✅ Frontend tests: 740 passed / 1 skipped / 0 failed
✅ PR #145 merged to develop (squash)
✅ Story 72 (P2) logged — adminRouter/feedbackRouter specific prefix mounts
✅ Story 75 (P1) logged — pre-push hook Vitest reliability

---

### Key Decisions Made (and Why)

**Additive-only backend changes.** All index.js changes followed the Zero-Downtime Constraint — new mounts added alongside existing ones, no handlers removed (except /test-public which had zero callers). Mount reorder was the only structural change to existing lines.

**Extract all three CLAUDE.md sections, not just the changelog.** Changelog alone got under 40k, but all three extractions put us at 35.4k — meaningful headroom for future growth without hitting the threshold again for many releases.

**Story 61 triage before starting new work.** Confirmed the fix was already shipped rather than re-implementing. Saved ~1 hour.

**--no-verify on final merge commit push.** Strict rule condition (a) failed (merge inherits frontend/ files), but conditions (b) and (c) were met (Bug #7 confirmed pattern, CI backstop). Override approved for merge commit + docs-only payload. Justified in PR #145 body.

**Story 75 logged as P1, not P3.** Bug #7 cost 45 min of wall time in a single session and required a rule override. Treating it as a nuisance (P3) understates the ongoing drag. P1 escalation means it gets addressed in the next governance pass, not deferred indefinitely.

---

### What We Could Have Done Better

1. **Commit or stash before every merge/checkout.** Occurred twice this session. Agent is now proactively halting — the pattern is established but needs to be the default reflex, not a recovery pattern.

2. **Verify ROADMAP story number before branch operations.** The Story 27 vs Story 61 mismatch cost 10 min. Rule: grep ROADMAP for the story title before assuming a branch name is current.

3. **Run smoke test before committing — not after.** The mount-order bug would have been caught before the first commit if a quick `node index.js` + curl had been the gate. Backend changes should include a local server start as a pre-commit step.

4. **Add stories at the end of the Backlog section.** Inserting Story 72 mid-file caused a positional merge conflict with Stories 73–74. Appending to the bottom of Backlog eliminates this class of conflict.

---

### Carry-Forward Items

| Priority | Story | Item | Notes |
|---|---|---|---|
| P1 | Story 75 | Move Vitest out of pre-push hook | Option A: keep lint/tsc in hook, Vitest to CI only |
| P1 | — | Phase 4C auth cutover | Parked; pending magic link validation + RLS |
| P2 | Story 72 | adminRouter/feedbackRouter specific prefix mounts | Bundle with Phase 4C |
| P2 | — | AI proxy route versioning (PR 2) | `/api/ai` → `/api/v1/ai`; requires App.jsx gate phrase |
| P2 | — | Version bump to v2.5.17 | Carries test-count edits + Story 75 commit + bump files |
| P3 | — | Cold start quantification | Pull UptimeRobot 30-day response time data |
| P3 | — | CLAUDE.md trim → main | On develop; promotes with next release |

**Uncommitted local state (must not be lost):**
- `CLAUDE.md` — test count updated 734 → 740
- `frontend/CLAUDE.md` — test count updated 737 → 740
- `docs/product/ROADMAP.md` Story 75 — committed as `d7fdc41`, unpushed

---

### Next Session Open Checklist

- [ ] `git status` on main worktree — confirm dirty state (CLAUDE.md + frontend/CLAUDE.md uncommitted)
- [ ] `git log --oneline -5 origin/develop` — anchor on current develop tip
- [ ] Confirm PR #145 merged on GitHub and develop is clean
- [ ] Start version bump: v2.5.16 → v2.5.17
  - Bump `APP_VERSION` in App.jsx (gate phrase required: `all clear — App.jsx editing approved`)
  - Prepend VERSION_HISTORY entry
  - Bump both package.json files
  - Update ROADMAP.md, CLAUDE.md, frontend/CLAUDE.md
  - Stage test-count edits + Story 75 commit in same bump
- [ ] `npm run build` — must be clean before push
- [ ] Push Story 75 + bump commits together
- [ ] Story 75 implementation: edit pre-push hook — remove Vitest, keep lint/tsc only
- [ ] Optional: Story 72 planning (adminRouter/feedbackRouter specific prefixes)

---

## 2026-05-19-B — Story 68: GitHub Settings Audit + v2.5.16 Prod Release

**Date:** May 19, 2026
**Session ID:** 2026-05-19-B (second session of the day; 2026-05-19-A was the automation/issue-bootstrap session)
**Duration:** ~4 hours (estimated)
**Version shipped:** v2.5.16
**PRs merged:** #133, #134, #136, #137, #138
**Issues filed:** #135 (Story 69)
**Stories closed:** Story 68 (Issue #132)

---

### Starting State

**Main worktree** (`C:\Users\KKUBERANA1\Documents\lineup-generator`)
- Branch: `develop`
- HEAD: `05a1a67` — `chore: add Story 68 GitHub Webhooks audit + link to GitHub Issue`
- Version: v2.5.15
- Tree: clean
- Context: came off session 2026-05-19-A (story sync, issue templates, label taxonomy — 27 issues bootstrapped #105–#131)

**UX worktree** (`C:\Users\KKUBERANA1\Documents\lineup-generator-ux`)
- Branch: `feature/ux-phase-3-support-pages`
- HEAD: `2d1febf` — `Merge remote-tracking branch 'origin/develop' into feature/ux-phase-3-support-pages`
- Tree: clean (develop synced to `05a1a67`)
- Note: memory had this as `feature/design-tokens` — stale; actual branch confirmed this session

**Production (`main`):** v2.5.15

---

### Ending State

**Main worktree**
- Branch: `develop`
- HEAD: `1d9d821` — squash-merged v2.5.16 release bump (PR #137)
- Version: v2.5.16
- Tree: clean (`.claude/` untracked — expected)
- App.jsx: skip-worktree lock confirmed active (`S` flag)

**UX worktree**
- Branch: `feature/ux-phase-3-support-pages`
- HEAD: `3d0dc39` — `Merge remote-tracking branch 'origin/develop' into feature/ux-phase-3-support-pages`
- Tree: clean (develop synced to `f049c32` — CODEOWNERS included)

**Production (`main`):** v2.5.16 — live at dugoutlineup.com
- 8 checks passed on PR #138
- Deployed via Vercel auto-deploy on merge

**Local branches at session end:**

| Branch | State |
|---|---|
| `develop` | ✅ Clean, current |
| `main` | ✅ v2.5.16 live |
| `feature/ux-phase-3-support-pages` | ✅ Clean (UX worktree) |
| `docs/doc-test-debt-legend-p3` | ⚠️ Unmerged single commit `8a48729` — deferred |
| `docs/v2514-checklist-followup` | ⚠️ Unmerged single commit `c5073ec` — deferred |

**Branches deleted this session:**

| Branch | Reason |
|---|---|
| `chore/codeowners` | Merged PR #133, force-deleted locally |
| `docs/story-68-69-roadmap` | Merged PR #136, force-deleted locally |
| `docs/bug-11-skip-worktree-trap` | Confirmed merged into develop, deleted cleanly |
| `release/v2.5.16` | Merged PR #137, force-deleted locally |

---

### What We Did

Walked a full 9-category GitHub repository settings audit (Story 68 / Issue #132), then released v2.5.16 to production.

**Audit categories, in order:**

| # | Category | Finding | Action |
|---|---|---|---|
| 1 | `.env*` gitignore | 5 patterns covered | None needed |
| 2 | Secrets scope | All 8 secrets flat; 6 Vercel-auto environments are shells | Deferred to P3 |
| 3 | Actions permissions | Read-only `GITHUB_TOKEN`, no self-approval | None needed |
| 4 | Branch protection | Both branches: PR required, both CI jobs enforced, no force push | None needed |
| 5 | GitHub Apps | Codex Connector + Grok had read/write to all repos | Both revoked |
| 6 | Dependabot | All off | Alerts enabled — 18 vulns surfaced |
| 7 | Deploy keys | None present | None needed |
| 8 | CODEOWNERS | Missing | Created + merged (PR #133) |
| 9 | Webhooks | None present | Planned: n8n webhook (future session) |

---

### Issues Faced

**Issue 1 — Wrong version number in bump instruction**
KK issued the version bump targeting `v2.5.7`. Actual current version was `v2.5.15`. Agent caught the discrepancy by checking the file.
- Root cause: KK didn't verify current version from source before writing the bump instruction
- Resolution: Agent flagged it; corrected to `v2.5.16`
- Time cost: ~5 min
- Prevention: Add `grep APP_VERSION frontend/src/App.jsx` as step 0 in the release ritual

**Issue 2 — VERSION_HISTORY location stale in mental model**
KK's bump instruction targeted App.jsx for the VERSION_HISTORY entry. It moved to `frontend/src/data/versionHistory.js` in v2.5.3. Agent corrected the target file.
- Root cause: Mental model not updated after the versionHistory.js extraction refactor
- Resolution: Agent corrected; plan updated to 6 files (not 5)
- Time cost: ~3 min
- Prevention: Update release ritual to name `versionHistory.js` explicitly

**Issue 3 — ROADMAP.md patch committed on already-merged branch**
After PR #134 merged, agent made further ROADMAP edits while still on `docs/story-68-69-roadmap`. Branch was already deleted from origin. Required re-pushing the branch and opening PR #136 for a one-line change.
- Root cause: No `git checkout develop && git pull` after PR merged before continuing
- Resolution: PR #136 opened and merged
- Time cost: ~20 min
- Prevention: Hard rule — after any PR merges, immediately `git checkout develop && git pull`

**Issue 4 — UX worktree had stale in-progress merge (MERGE_HEAD)**
During session close-out, UX worktree had `MERGE_HEAD` from a prior session's incomplete merge. `git merge` failed with `fatal: You have not concluded your merge`.
- Root cause: Prior session's merge was interrupted and not resolved
- Resolution: `git restore --staged .github/CODEOWNERS` → `git add` → `git commit --no-edit`
- Time cost: ~10 min
- Prevention: Add `git status` check on all worktrees as standard session-open step

**Issue 5 — CODEOWNERS appeared as staged in UX worktree unexpectedly**
When UX worktree merge was unblocked, CODEOWNERS showed as staged (`A`) — the in-progress merge had already staged it.
- Root cause: In-progress merge state had CODEOWNERS in the index
- Resolution: `git restore --staged` then re-added cleanly as part of merge commit
- Time cost: ~5 min

**Issue 6 — 6 Vercel-auto-created environments blocked secret scoping plan**
Audit plan called `SUPABASE_SERVICE_ROLE_KEY` scoping a P1 — assuming clean environments. Six Vercel-managed environments existed; none suitable without a dedicated `backend-ci` environment and `ci.yml` patch.
- Root cause: Audit plan did not account for Vercel's auto-environment creation or repo rename history
- Resolution: Downgraded to P3
- Time cost: ~10 min
- Prevention: Check environments page before making priority calls on secret scoping

**Issue 7 — Agent flagged already-merged branch as needing a PR**
Mid-session, agent referenced `chore/codeowners` as needing a PR even though PR #133 had already merged.
- Root cause: Agent has no persistent state between tool calls — its branch/PR view is only what's in the current context window
- Resolution: KK corrected verbally
- Time cost: ~2 min
- Prevention: Periodically re-anchor agent with `git branch && git log --oneline -5 origin/develop`

**Issue 8 — Bug #7 fired on CODEOWNERS pre-push**
Pre-push hook ran 734-test suite. Passed (733/734, 1 skipped) but exited 1 due to Bug #7 worker-timeout flake.
- Root cause: Bug #7 — Windows Vitest cold-start worker-timeout flake (documented in CLAUDE.md)
- Resolution: All three Bug #7 exception criteria met; `--no-verify` applied
- Time cost: ~9 min (full suite run)

**Issue 9 — `--no-verify` exception criteria technically violated on version bump**
Release bump touched `frontend/` files, violating exception condition (a): "zero frontend/ files changed." Agent correctly refused to proceed.
- Root cause: Exception criteria written for docs-only patches; release bumps always touch `frontend/`
- Resolution: Explicit justification paragraph added to commit message body
- Time cost: ~5 min
- Prevention: Add release bump as a named exception in CLAUDE.md `--no-verify` documentation

**Issue 10 — `pr_body.txt` left untracked in repo root**
Temp file from a failed `gh pr create` attempt sat untracked. Agent caught it before staging.
- Root cause: `gh` CLI not installed; failed attempt left a temp file
- Resolution: `Remove-Item pr_body.txt`
- Time cost: ~1 min
- Prevention: Always inspect untracked files in `git status --short` before any `git add`

**Issue 11 — Version bump staged on already-merged docs branch**
Version bump files staged while on `docs/story-68-69-roadmap` — already merged. Required stash, new branch, pop, re-stage.
- Root cause: Same as Issue 3 — no `git checkout develop` after docs PR merged
- Resolution: `git stash --include-untracked` → develop → `release/v2.5.16` → pop → re-stage
- Time cost: ~10 min

---

### What Was Accomplished

- ✅ Story 68 (Issue #132) fully resolved — all 9 audit categories walked
- ✅ ChatGPT Codex Connector revoked (read/write to all repos)
- ✅ Grok (by xAI) revoked (read/write to all repos)
- ✅ Dependabot alerts enabled — 18 vulnerabilities surfaced (6 high, 12 moderate)
- ✅ CODEOWNERS created and merged (PR #133) — 9 locked paths covered
- ✅ Branch protection confirmed correctly configured on `main` and `develop`
- ✅ Actions permissions confirmed: read-only `GITHUB_TOKEN`, no self-approval
- ✅ Story 69 opened (Issue #135) — Dependabot triage queued as P2
- ✅ v2.5.16 shipped to production — 8 checks passed, live at dugoutlineup.com

---

### Key Decisions Made (and Why)

**Revoke Codex Connector and Grok immediately.**
Both had read/write access to actions, code, issues, PRs, and workflows across all repos. Neither actively used. No debate.

**Defer `SUPABASE_SERVICE_ROLE_KEY` scoping to P3.**
Six Vercel-auto-created environments made the fix a 45-minute scoped task. Private repo + solo operator = low practical risk today.

**CODEOWNERS as signal, not hard gate.**
Solo operator can't approve own PRs — enabling enforcement would create a merge blocker. Enable when first collaborator joins.

**Overnight soak waived for v2.5.16.**
Zero app logic changed. All 12 commits were governance/docs/CI-ops. Meta-governance exemption applied and documented in PR #138 body.

**`--no-verify` with written justification in commit body.**
Release bumps always touch `frontend/` files, technically violating exception condition (a). Justification paragraph in commit body rather than silent override. Clean precedent for future release bumps.

---

### What We Could Have Done Better

1. **Verify current version from source before any bump instruction.** `grep APP_VERSION` prevents Issue 1 every time.
2. **`git checkout develop && git pull` after every PR merge before continuing.** Issues 3 and 11 both trace to this single missing habit.
3. **Check both worktree states at session open, not just session close.** Issue 4 would have been caught 3 hours earlier.
4. **Check environments page before making priority calls on secret scoping.** Issue 6 cost ~10 min.
5. **Document release bump as a named `--no-verify` exception in CLAUDE.md.** Issue 9 should not require debate at release time.

---

### Release Ritual Notes (v2.5.16)

- Overnight soak waived: meta-governance exemption applied, documented in PR #138 body
- `--no-verify` on release commit `c9892e7`: justification in commit body, Bug #7 confirmed
- App.jsx skip-worktree (Bug #11): unlock → edit → re-lock followed correctly; `S` flag confirmed at session end
- VERSION_HISTORY location: `frontend/src/data/versionHistory.js` (moved in v2.5.3 — not App.jsx)
- 6 files bumped: `App.jsx`, `versionHistory.js`, `frontend/package.json`, `backend/package.json`, `ROADMAP.md`, `CLAUDE.md`
- Schema: `{ version, date: "Month YYYY", headline, techNote, userChanges[], internalChanges[] }`
- `techNote`: `"Minor fixes and internal improvements"` — approved string, passes `versionHistory.test.js`

---

### Carry-Forward Items

| Priority | Story | Issue | Item |
|---|---|---|---|
| P1 | Story 69 | #135 | Triage 18 Dependabot alerts — before next app release |
| P2 | Story 71 (TBD) | TBD | Version history audit — standardize schema across all entries |
| P2 | — | — | n8n webhook: `workflow_run` → auto-GitHub Issue on health check failure |
| P3 | Story 70 (TBD) | TBD | Backfill v2.5.15 in ROADMAP + add `versionHistory.js` to CODEOWNERS |
| P3 | Story 68 deferred | #132 | Scope `SUPABASE_SERVICE_ROLE_KEY` + `ADMIN_KEY` to `backend-ci` environment |
| — | — | — | Inspect `docs/doc-test-debt-legend-p3` (commit `8a48729`) — unmerged |
| — | — | — | Inspect `docs/v2514-checklist-followup` (commit `c5073ec`) — unmerged |

---

### Next Session Open Checklist

- [ ] `git status` on both worktrees before any work
- [ ] `git log --oneline -5 origin/develop` to anchor agent on current state
- [ ] Start with Story 69 Dependabot triage → `https://github.com/kaushikkuberanathan/lineup_generator/security/dependabot`
