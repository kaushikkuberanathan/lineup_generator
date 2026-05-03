# UX Architecture Refactor — Canonical Roadmap

**Branch:** `feature/design-tokens`
**Worktree:** `C:\Users\KKUBERANA1\Documents\lineup-generator-ux`
**Owner:** KK (kaushik.kuberanathan@gmail.com)
**Created:** 2026-05-01
**Status:** Phase 1 in progress

> Every future UX session on this branch reads this document first.
> It is the single source of truth for context, sequencing, scope, gate
> phrases, and session handoff state.

---

## 1. Mission Statement

The UX architecture track exists to solve five compounding P0 problems that
will become blockers as the app scales toward more coaches and more surfaces:

| # | Problem | Why it matters |
|---|---------|----------------|
| P1 | **No design tokens** | 150+ distinct hex values, 130+ rgba variants, 300+ inline style objects. Every color change requires grep-and-replace across 9,800 lines. Brand updates are impossible to do safely. |
| P2 | **Three competing design languages** | Slate ramp, gray ramp, and bootstrap-era palette are mixed across the same screen. Visual inconsistency is already visible to coaches. |
| P3 | **Accessibility is opt-in** | `ACCESSIBILITY_V1` defaults to `false`. Coaches who need larger touch targets and higher contrast — exactly the ones using this on a muddy field — don't get it unless they know to enable it. |
| P4 | **No UI primitives** | Duplicate key bugs (`LockFlow.jsx:130`), inline style objects 10+ properties long, no enforcement mechanism. Every new component invents its own design conventions. |
| P5 | **Sequencing trap** | App.jsx is 9,800 lines. Without tokens and primitives as a stable foundation, any refactor of App.jsx creates new drift faster than it removes old drift. The sequence must be: tokens → a11y GA → lint → primitives → App.jsx split → auth re-skin. |

---

## 2. Phase Map

### Phase 1 — Foundation (v2.4.x) — **IN PROGRESS**

**Goal:** Establish the design token system, ship accessibility as default-on,
restore the lint pipeline, and document shadow tokens.

| Sub-phase | Deliverable | Status |
|-----------|-------------|--------|
| 1.0 — Design tokens | `frontend/src/theme/tokens.js` + `theme/index.js` + 27 tests + `DESIGN_AUDIT.md` | ✅ Done — commit `9ea4ff4` |
| 1a — A11y GA | Audit doc, flag flip `ACCESSIBILITY_V1: false → true`, test update, fix-now findings | 🔄 This session |
| 1b — ESLint restoration | `eslint.config.js` (or `.eslintrc.cjs`), `LINT_BASELINE.md`, in-scope fixes | 🔄 This session |
| 1c — Shadow tokens | Shadow recon, `shadow.sm/md/lg` tokens, addendum to `DESIGN_AUDIT.md` | ⬜ Deferred to v2.4.1 |

**Version target:** 1a + 1b ship under v2.4.x umbrella. Actual APP_VERSION
bump happens when the parallel Game Day branch merges and all v2.4.x phases
are complete.

---

### Phase 2 — UI Primitives (v2.5.0)

**Goal:** Extract `<Text>`, `<Button>`, `<Card>`, `<Badge>`, `<Stack>` as
reusable primitives that consume tokens. Every new component uses primitives
instead of inline style objects.

**Key deliverables:**
- `frontend/src/components/ui/Text.jsx` — maps `size` + `weight` + `color`
  props to token values. Eliminates duplicate-key bugs at call sites.
- `frontend/src/components/ui/Button.jsx` — enforces 44×44 touch targets
  at the primitive level. Accessibility floor is structural, not a flag.
- `frontend/src/components/ui/Card.jsx` — standard navy/white card surface.
- `frontend/src/components/ui/Badge.jsx` — status chip with color variants.
- `frontend/src/components/ui/Stack.jsx` — layout primitive for consistent gap.
- `tint()` utility for deriving tinted surfaces without pre-mixed rgba tokens.
- Tests: shape + render tests for each primitive.

**Dependencies:** Phase 1 complete. Tokens must be stable before primitives
consume them.

---

### Phase 3 — Call-Site Replacement (v2.5.x)

**Goal:** Migrate the highest-frequency inline style drift values in
non-App.jsx files to token references and primitive components. App.jsx
drift is catalogued but not touched — it waits for Phase 4.

**Scope (by drift category):**
- Navy variant consolidation (`#1A3260`, `#1B2A4A`, etc. → `color.brand.navy`)
- Gray ramp → slate ramp migration
- `#555`, `#888`, `#CCC`, `#AAA` shorthand resolution
- `10px` font size migration (146 occurrences) to `font.size.xs` (11px) or
  annotated exceptions
- Off-scale radius consolidation (`10px` → `radius.md`, etc.)
- Half-step spacing normalization (`6px`, `10px`, `14px`)

**Scope boundary:** Only non-locked component files. App.jsx drift is
Phase 4 work. Any call-site replacement that changes visual output on a
component shared with App.jsx requires KK sign-off.

**Dependencies:** Phase 2 primitives must be stable before replacement begins.
You cannot replace an inline style with a primitive call that doesn't exist yet.

---

### Phase 4 — App.jsx Decomposition (v2.6.0)

**Goal:** Break the 9,800-line App.jsx into feature modules. Each tab
(Roster, GameDay, Season, More) becomes an independently importable component.
App.jsx becomes a router/shell only.

**Key decisions (to be made in Phase 4 session):**
- File-per-tab or directory-per-tab structure
- State management: prop drilling vs. context vs. Zustand
- Migration strategy: extract-and-import vs. rewrite (recommend extract-first)
- Test coverage gate before extraction of each section

**Dependencies:** Phases 1–3 complete. Call-site replacement must be done
first so that extracted components don't carry large inline style debt into
their new files.

**Risk:** Highest-risk phase. App.jsx is the entire app. The 24-hour develop
soak rule applies with extra weight here. Game-day validation is mandatory
before promoting any Phase 4 work to main.

---

### Phase 5 — Auth Re-Skin (v2.7.0)

**Goal:** Replace the `#2471A3`/`#2980B9` auth-screen palette (preserved
as drift in Phase 1 specifically for this phase) with the canonical design
system. Align auth screens visually with the main app.

**Dependencies:** Phase 4 complete. Auth screens should be isolated
components before re-skinning.

**Note:** Auth screen re-skin is cosmetic only. No auth behavioral changes
belong here — those are the Phase 4C auth cutover items documented in
`CLAUDE.md`.

---

### Phase 6 — Design System Docs (v2.8.0)

**Goal:** Storybook or equivalent living documentation of all primitives,
tokens, and usage patterns. Component playground for future development.

**Dependencies:** Phases 1–5 complete. The design system must be stable
before documenting it as canonical.

---

## 3. Locked Files Registry

**Current session locks (until App.jsx gate phrase):**

| File | Reason locked | Who owns it |
|------|--------------|-------------|
| `frontend/src/App.jsx` | 9,800 lines; parallel Game Day session edits it | Parallel session / Phase 4 |
| `frontend/src/utils/migrations.js` | Parallel session territory | Parallel session |
| `frontend/src/utils/formatters.js` | Parallel session territory | Parallel session |
| `frontend/src/utils/flagBootstrap.js` | Parallel session territory | Parallel session |
| `frontend/src/components/game-mode/*` | Parallel session owns Game Mode behavioral changes | Parallel session |
| `frontend/src/components/ScoringMode/*` | Parallel session territory | Parallel session |
| `frontend/package.json` | No version bumps until v2.4.x umbrella closes | KK-directed only |
| `backend/package.json` | No version bumps until v2.4.x umbrella closes | KK-directed only |
| `CLAUDE.md` | No version history edits until umbrella closes | KK-directed only |
| `docs/product/ROADMAP.md` | No version history edits; new sections OK | KK-directed only |

**In-scope exception for this session:**

| File | Why unlocked |
|------|-------------|
| `frontend/src/config/featureFlags.js` | Phase 1a explicitly requires the `ACCESSIBILITY_V1` flag flip |

---

## 4. Gate Phrases Reference

| Gate phrase | What it unlocks | Example usage |
|-------------|----------------|--------------|
| `all clear — App.jsx editing approved` | Allows edits to `App.jsx` and all other locked files listed above | KK types this when the parallel session is complete and merged |
| `confirmed — push to feature/design-tokens` | Authorizes a `git push origin feature/design-tokens` | KK types this after reviewing local commit output |

**STOP template** (use when a task requires a locked file):

> "This task would require editing [locked file], which is locked.
> Options: (a) defer this part of the work until [file] is unlocked,
> (b) restructure the task so it only creates new files, or (c) wait
> for the user to type the gate phrase '[appropriate gate phrase]'.
> Which would you like?"

---

## 5. Working Agreements

These carry forward from the v2.4.0 session and apply to every subsequent
UX session on this branch.

### Windows-only
- No Mac/Unix commands. PowerShell only.
- Heredoc syntax `$(cat <<'EOF' ... EOF)` does NOT work. Use temp files
  or PowerShell here-strings (`@" ... "@`) for multi-line content.
- KK is not a power CLI user. Provide step-by-step instructions:
  which window, one command at a time, expected output, what to do if
  it fails.

### Test-first (RED → GREEN)
- Write the failing test before writing the fix.
- RED output is a required deliverable. Run the test, confirm it fails,
  paste the failure to KK before fixing.
- If RED was skipped accidentally: substitute a mutation test (inject a
  known violation, confirm RED, restore, confirm GREEN). Document both.
- A test that has never failed is a test that may never fail.

### Stage by path
- `git add frontend/src/config/featureFlags.js frontend/src/tests/...`
- Never `git add -A` or `git add .`
- If over-staged: `git restore --staged <file>`

### Local only
- No Vercel deploy, no Render touch, no CI dispatch, no PR creation,
  no Supabase queries, no npm publish.
- No commit, no push without KK's directive.

### One diff at a time
- For code changes: show the diff to KK before applying.
- For multi-file changes: one file at a time, one approval at a time.

### Scope discipline
- Do not fix things not asked for, even if they look broken.
- Do not refactor code adjacent to the task.
- Do not add comments explaining what code does — only add comments
  for non-obvious WHY constraints.

---

## 6. Sequencing Rationale

Why this order, and why it matters:

```
tokens (1.0) → a11y GA (1a) → lint (1b) → shadows (1c)
  → primitives (2) → call-site replacement (3)
    → App.jsx decomposition (4)
      → auth re-skin (5) → design system docs (6)
```

**Tokens before primitives:** Primitives consume tokens. If you build
primitives before tokens are stable, primitive values are hardcoded and
you replicate the drift problem one level up.

**A11y GA before primitives:** Once primitives enforce 44px touch targets
structurally, the flag becomes meaningless — the floor is baked in.
Promote it to default-on now so coaches get it immediately, before
the structural solution exists.

**Lint before call-site replacement:** You cannot do call-site replacement
cleanly in a codebase where lint is broken. Every replaced call site should
pass lint. Restoring lint now means Phase 3 starts with a clean pipeline.

**Primitives before App.jsx split:** If you decompose App.jsx into modules
before primitives exist, the extracted modules immediately accumulate new
inline style drift. The extraction must happen into a codebase where the
right pattern (primitive components) is already available.

**App.jsx split before auth re-skin:** Auth components are currently in
App.jsx. You can't re-skin them without first extracting them.

**All phases before design system docs:** Documentation of a moving target
is wasted effort. Document once the system is stable.

---

## 7. Cross-Session Handoff

If you are a fresh Claude Code session starting on this branch, read this
section first to bootstrap.

**Step 1: Confirm you are in the right worktree**
```
git log --oneline -3
```
Expected: `9ea4ff4 feat(tokens): v2.4.0 design tokens scaffolding` as the
most recent commit, or newer commits from subsequent phases.

**Step 2: Read the active state**
- This document (you're reading it)
- `docs/product/DESIGN_AUDIT.md` — full token provenance from Phase 1.0
- `docs/features/accessibility-v1.md` — ACCESSIBILITY_V1 feature guide
- `frontend/src/theme/tokens.js` — the token source
- `frontend/src/tests/theme.tokens.test.js` — 27 shape tests

**Step 3: Check what's been done this session**
Look at git log since `9ea4ff4`. New commits indicate phases that have
already landed. The Done-So-Far ledger in §8 is updated after each commit.

**Step 4: Confirm locked files before touching anything**
§3 lists current locks. If the parallel Game Day session has merged and
KK has said `all clear — App.jsx editing approved`, the locks are lifted.
If you don't know, ask KK before touching any locked file.

**Step 5: Resume the active phase**
The Active Backlog in §9 shows which phase is in progress and where it
stopped. Pick up from the last completed step.

---

## 8. Done-So-Far Ledger

| Phase | Commit | What shipped |
|-------|--------|-------------|
| 1.0 — Design tokens | `9ea4ff4` | `frontend/src/theme/tokens.js` (full token set: color, overlay, opacity, space, radius, font, zIndex) · `frontend/src/theme/index.js` (barrel + named convenience exports) · `frontend/src/tests/theme.tokens.test.js` (27 tests, all passing) · `docs/product/DESIGN_AUDIT.md` (full provenance audit: 150+ colors, 130+ rgba, spacing, font, radius inventories; drift flags; token mapping table) · Build: clean · Tests: 27/27 pass |

**Deferred from Phase 1.0:**
- Shadow tokens (`shadow.sm/md/lg`) — 16 distinct box-shadow values found,
  not enough clean clustering for 3-token mapping. Deferred to v2.4.1.
  See `DESIGN_AUDIT.md` §6 for the recon findings and v2.4.1 instructions.
- ESLint configuration — pre-existing gap. Pipeline broken on fresh clone.
  Deferred to Phase 1b (this session).
- `LockFlow.jsx:130` duplicate fontSize bug — out of scope (not a theme file).
  Deferred to v2.5.x call-site replacement.

---

## 9. Active Backlog

### Phase 1a — Accessibility V1 GA (this session, not yet started)

**Status:** Awaiting KK approval of this roadmap doc before starting recon.

**Steps:**
- [ ] A — PowerShell recon: audit non-Game-Mode component files for font
  sizes < 12px, touch targets < 44px, missing aria-labels
- [ ] B — Write `docs/product/A11Y_AUDIT.md` with findings categorized as
  fix-now / defer-to-v2.5.x / defer-to-v2.6.0
- [ ] C — For each fix-now finding: write failing test (RED), show diff, fix
  to GREEN, repeat
- [ ] D — Flip `featureFlags.js` `ACCESSIBILITY_V1: false → true`; update
  `accessibility.v1.test.js` to add GA-default assertion
- [ ] E — Run `cd frontend && npm test` + `npm run build`. Show KK output.
  Stop and await commit direction.

**Expected output files:**
- `docs/product/A11Y_AUDIT.md`
- Updated `frontend/src/config/featureFlags.js`
- Updated `frontend/src/tests/accessibility.v1.test.js`
- Possibly updated Shared/* component files (fix-now findings only)

---

### Phase 1b — ESLint Pipeline Restoration (this session, after 1a)

**Status:** Not started.

**Steps:**
- [ ] F — Read `frontend/package.json`, confirm ESLint version, decide
  config format (flat config v9+ or legacy v8). Stop, show KK, get approval.
- [ ] G — Write ESLint config. Show KK before saving.
- [ ] H — Run `npm run lint`, capture output. Summarize counts and top rules.
  Show KK.
- [ ] I — Write `docs/product/LINT_BASELINE.md` with in-scope vs out-of-scope
  split. Show KK before fixing.
- [ ] J — Fix in-scope findings (theme/*, Shared/*, Support/*), one file at
  a time with per-file approval.
- [ ] K — Run lint again. Confirm in-scope files clean. Stop and await
  commit direction.

**Expected output files:**
- `frontend/eslint.config.js` (or `frontend/.eslintrc.cjs`)
- `docs/product/LINT_BASELINE.md`
- Updated `frontend/src/theme/tokens.js` (if lint findings)
- Updated `frontend/src/theme/index.js` (if lint findings)
- Updated Shared/Support component files (in-scope lint findings only)

---

### Phase 1c — Shadow Tokens (v2.4.1, deferred from this session)

**Status:** Deferred. Do not start until after Phase 1a + 1b are committed.

**Instructions for the v2.4.1 session:**
1. Re-run the `boxShadow` recon script (21 occurrences, 16 distinct values
   found in the v2.4.0 session — re-run to verify still current)
2. Cluster the values by visual weight: subtle lift, card elevation, modal/overlay
3. Propose `shadow.sm`, `shadow.md`, `shadow.lg` tokens
4. Write failing test (RED) before adding tokens
5. Add shadow group to `frontend/src/theme/tokens.js`
6. Add shadow exports to `frontend/src/theme/index.js`
7. Add test cases to `theme.tokens.test.js`
8. Document addendum in `docs/product/DESIGN_AUDIT.md` §6

---

## 10. Out-of-Scope Explicit List

These items look like UX work but are NOT in scope for this track:

| Item | Why out of scope | Where it belongs |
|------|-----------------|-----------------|
| Game Mode behavioral changes | Parallel session owns Game Mode | `feature/combined-game-view` or later feature branch |
| Live Scoring UI changes | Parallel session territory | Same |
| Auth behavioral changes (magic link, OAuth, session management) | Phase 4C auth cutover is a separate infrastructure track | `CLAUDE.md` Phase 4C checklist |
| Database schema changes | Zero-downtime constraint; out of scope for UX work | Additive backend migrations only |
| Backend route changes | Additive only per CLAUDE.md | Backend session |
| Performance optimization | Not a UX architecture concern | Separate session when needed |
| New features (new tabs, new scoring flows) | UX track is refactor-only; new features get their own branches | Feature branches from develop |
| Storybook / component playground | Phase 6 only; premature before Phase 5 | v2.8.0 |
| Supabase feature_flags table changes | Infrastructure, not UX | Backend session |
| `lineupEngineV2.js` changes | Scoring engine is not UX | Lineup engine session |
| `formatters.js` changes | Locked; parallel session territory during Phase 1 | After App.jsx gate phrase |

---

*This document is updated at the end of each UX session. The Done-So-Far
ledger and Active Backlog are the highest-priority sections to keep current.*
