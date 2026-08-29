# Issue Tracking & Backlog Hygiene

**Canonical reference** for GitHub Issue conventions, label taxonomy, story-to-issue linking, commit/PR conventions, and backlog scripts.

Rules summary lives in `CLAUDE.md § Issue & Backlog Hygiene`. This doc is the detailed reference.

---

## Story → Issue Flow

Every Story in `docs/product/ROADMAP.md` must have a matching GitHub Issue. This is the single system of record for backlog state.

### Adding a new story (one-at-a-time)

1. Write the Story block in `ROADMAP.md` using the Story template format (see `CLAUDE.md § Story template for ROADMAP backlog`)
2. Open a new GitHub Issue using the **📋 Story** template:
https://github.com/kaushikkuberanathan/lineup_generator/issues/new/choose
3. Fill every required field — Priority, Area, Discovered, Symptom, Impact
4. Submit → note the issue number (e.g. `#132`)
5. Add `<!-- #132 -->` to the Story heading in ROADMAP.md:
```markdown
   ### Story 68 (P2) — GitHub Webhooks & Settings Audit <!-- #132 -->
```
6. Commit the ROADMAP.md change with the story addition

### Batch sync (stories without issue numbers)

When multiple stories accumulate without GitHub Issues:

```powershell
# PowerShell — token must be set
$env:GITHUB_TOKEN = $TOKEN

# Step 1: preview what will be created
node scripts/sync-stories-to-issues.js --dry-run

# Step 2: review output — check inferred labels are correct
# Step 3: create issues and patch ROADMAP.md
node scripts/sync-stories-to-issues.js
```

Script behaviour:
- Skips stories with `Status: Resolved` — resolved stories do not need open issues
- Skips stories already tagged with `<!-- #N -->` — idempotent, safe to re-run
- Infers `area:*` and `type:*` labels from body content keywords
- Patches ROADMAP.md in place — commit the file after running

After running: always review inferred labels and correct misfires in the GitHub UI before closing the session.

---

## Label Taxonomy

**Live count confirmed 2026-08-23: 44 labels.** `scripts/setup-github-labels.ps1` only defines **31** — it is stale and understates the real taxonomy by at least 13. This is exactly the "Label drift" scenario the rule below exists to prevent: labels have been created by hand, directly in the GitHub UI, outside the script.

**Confirmed by direct evidence, not just the 44 figure taken on faith:** with no list-all-labels tool available this session, all 255 issues (119 open + 136 closed) were pulled via the GitHub MCP server and their applied labels aggregated. That surfaced **7 labels in active use that the script has never defined**:

| Label | Seen on |
|---|---|
| `type:testing` | #431, #424, #423, #481, #478, #477, #586 |
| `type:tech-debt` | #735 |
| `type:security` | #651, #650 |
| `area:governance` | #644, #234, #225, #242, #302, #300, #770 |
| `area:testing` | #517, #482, #410, #406, #378, #425, #407, #721, #599 |
| `area:frontend` | #650, #721, #719, #718, #716 |
| `area:infra` | #715 |

31 (script) + 7 (confirmed above) = 38 verified. The remaining ~6 toward the confirmed 44 are real but not yet individually identified — this aggregation method only sees labels applied to at least one issue, so a label that exists with zero issues currently on it (plausible for something rare like `hotfix-exception`) stays invisible to it. Full reconciliation still needs an actual label-list call (`gh label list`, the repo's Labels settings page, or a session with broader GitHub API access) — treat 38 as a floor, not the ceiling, and 44 as the number to design against.

**Action needed, not yet done:** `scripts/setup-github-labels.ps1` should be updated to define at least these 7 confirmed labels (and the rest, once identified) so it's trustworthy again as the "reset drift" tool — right now running it would not restore the actual taxonomy, only the stale 31-label subset.

### Priority (required on every issue)

| Label | Color | Meaning |
|---|---|---|
| `priority:p0` | 🔴 red | Production broken or data at risk — drop everything |
| `priority:p1` | 🟠 orange | Blocks a coach in the field — fix this release |
| `priority:p2` | 🟡 yellow | Important but not blocking — next 1–2 releases |
| `priority:p3` | 🔵 light blue | Nice to have — backlog |

### Type (required on every issue)

| Label | Meaning |
|---|---|
| `type:bug` | Something is broken |
| `type:feature` | New capability |
| `type:chore` | Refactor, cleanup, dependency bump |
| `type:governance` | Docs, test debt, process |
| `type:hotfix` | Emergency production fix — bypass overnight soak |
| `type:incident` | Live production incident |
| `type:docs` | Documentation changes only |
| `type:refactor` | Code refactor with no behavior change |
| `type:testing` | Test coverage work (confirmed live 2026-08-23, undocumented until now — not in `setup-github-labels.ps1`) |
| `type:tech-debt` | Technical debt distinct from `type:chore` (confirmed live 2026-08-23, undocumented until now) |
| `type:security` | Security-specific findings/fixes (confirmed live 2026-08-23, undocumented until now) |

### Area (strongly recommended)

| Label | Covers |
|---|---|
| `area:scoring` | Live scoring, pitch tracking, game mode, DugoutView |
| `area:auth` | Magic link, Google sign-in, sessions, RLS, memberships (phone/OTP was permanently removed — root `CLAUDE.md` → Auth Strategy) |
| `area:ux` | Frontend UX, design tokens, component primitives |
| `area:backend` | Express API, Render, backend logic |
| `area:ci-ops` | GitHub Actions, Husky, Vitest, deployment, scripts |
| `area:game-mode` | Game day overlay, DugoutView, ScoringMode |
| `area:share-link` | Share link routing, unauthenticated viewer |
| `area:roster` | Roster management, batting order, lineup engine |
| `area:supabase` | DB schema, RLS policies, migrations |
| `area:analytics` | Mixpanel events, Vercel Analytics |
| `area:governance` | Process, docs, backlog hygiene (confirmed live 2026-08-23, undocumented until now — overlaps `type:governance`; usage distinction not yet defined) |
| `area:testing` | Test infrastructure/coverage, distinct from `type:testing` above (confirmed live 2026-08-23, undocumented until now) |
| `area:frontend` | Frontend-general, broader than `area:ux` (confirmed live 2026-08-23, undocumented until now — usage distinction from `area:ux` not yet defined) |
| `area:infra` | Infrastructure (confirmed live 2026-08-23, undocumented until now — overlaps `area:ci-ops`/`area:backend`; usage distinction not yet defined) |

### Status (apply when relevant)

| Label | Meaning |
|---|---|
| `status:blocked` | Cannot proceed — waiting on a dependency |
| `status:in-progress` | Actively being worked |
| `status:deferred` | Intentionally pushed to a future phase |
| `status:needs-repro` | Bug reported but not yet confirmed |
| `status:ready-for-review` | PR is ready for review and merge |

### Meta

| Label | Meaning |
|---|---|
| `auto-created` | Created by automation (health check, feedback bridge, sync script) |
| `source:coach-feedback` | Originated from in-app bug report submission |
| `needs-overnight-soak` | Merged to develop — awaiting overnight soak before main |
| `hotfix-exception` | Ship Gate bypassed — reason must be in commit message body |

### Resetting labels

If labels drift or the repo is cloned fresh:

```powershell
$env:GITHUB_TOKEN = $TOKEN
.\scripts\setup-github-labels.ps1
```

Safe to re-run — uses `--force` which updates existing labels without duplicating. **Does not currently reconcile drift** — as of 2026-08-23 the script only defines 31 of the confirmed-live 44 labels (see the 7 confirmed-missing ones above), so re-running it will not remove or flag labels that exist outside its list, and won't create the ~6 still-unidentified ones either. Add the missing labels to the script before treating a re-run as a full reset.

---

## Commit Message Conventions

### Resolving a story

Any commit that fully resolves a story must include `closes #N` in the message body. GitHub auto-closes the issue when the commit lands on `main`.
fix: share link routing no longer drops ?s= param on cold load
Root cause: App.jsx renderSharedView was not reading the param before
React hydration completed. Fixed by moving param extraction to a ref
that persists across renders.
closes #127

### Partial progress (story stays open)

Use `refs #N` or `relates to #N` — does not auto-close the issue.
fix: null guard added to dbLoadShareLink
Addresses one of three failure modes in Story 62. Full fix requires
the retry logic in the next commit.
refs #127

### Multiple issues
closes #119, closes #120

---

## PR Body Conventions

The **Related Issue** field in every PR body must never be left as N/A when a story is being resolved.

```markdown
## Related Issue
closes #127 — share link routing broken
closes #119 — auto-sync defense view inning
```

For PRs that touch multiple stories, list all of them. GitHub will close each issue on merge to `main`.

---

## GitHub Issue Templates

Three templates at `.github/ISSUE_TEMPLATE/`:

| Template | File | Use for |
|---|---|---|
| 🐛 Bug Report | `bug_report.yml` | Broken behavior, regressions, coach-reported issues |
| 📋 Story | `story.yml` | Any new backlog story (mirrors ROADMAP Story template) |
| 📚 Governance / Debt | `governance.yml` | DOC_TEST_DEBT items, process gaps, tooling issues |

Template chooser (bookmark this):
https://github.com/kaushikkuberanathan/lineup_generator/issues/new/choose

**After filing a Governance issue:** add the issue number to the matching entry in `docs/product/DOC_TEST_DEBT.md`.

---

## Backlog Hygiene Rules

1. **Every session that adds a story** → GitHub Issue filed before session ends
2. **Every session that resolves a story** → GitHub Issue closed (via `closes #N` in commit or manually)
3. **P0 issues** → must have `status:blocked` or `status:in-progress` at all times — never sit unlabelled
4. **Deferred stories** → apply `status:deferred` label, add deferral reason to issue body
5. **DOC_TEST_DEBT items** → file Governance issues; reference issue number in the debt ledger row
6. **Label drift** → run `setup-github-labels.ps1` to reset; never manually create labels outside the script

---

## Scripts Reference

| Script | Location | Purpose |
|---|---|---|
| `sync-stories-to-issues.js` | `scripts/` | Parse ROADMAP.md → create GitHub Issues → patch `<!-- #N -->` |
| `setup-github-labels.ps1` | `scripts/` | Bootstrap / reset all 31 labels |

Both scripts require `$env:GITHUB_TOKEN` to be set (PAT with `repo` scope).

---

## Quick Filters (bookmark these)
All open P0s
https://github.com/kaushikkuberanathan/lineup_generator/issues?q=is:open+label:priority:p0
All open P1s
https://github.com/kaushikkuberanathan/lineup_generator/issues?q=is:open+label:priority:p1
Everything scoring-related
https://github.com/kaushikkuberanathan/lineup_generator/issues?q=is:open+label:area:scoring
In-progress work
https://github.com/kaushikkuberanathan/lineup_generator/issues?q=is:open+label:status:in-progress
Auto-created (health check / feedback)
https://github.com/kaushikkuberanathan/lineup_generator/issues?q=label:auto-created

---

*Last updated: 2026-08-23. Maintained alongside `CLAUDE.md` — update both when process changes.*
