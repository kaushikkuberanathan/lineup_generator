# Story 133 — Live Game-Day Surface Token Migration — Handoff

**Read this before touching `game-mode/*` or `ScoringMode/*`.** This is the
single source of truth for this specific initiative's current state,
conventions, and remaining work. Update it in place as slices land — do not
let it go stale the way other handoff docs in this repo have.

**Tracking issue:** [#698](https://github.com/kaushikkuberanathan/lineup_generator/issues/698)
— the umbrella for all 13 slices. Read its full comment history before
starting; it is more current than `ROADMAP.md`'s Story 133 entry (see
"Known doc staleness" below).

**Last updated:** 2026-08-18, after slice 3 merged and slice 4's branch was
cut (no commits yet).

---

## 1. What this is, in one paragraph

Neither `frontend/src/components/game-mode/*` nor
`frontend/src/components/ScoringMode/*` has ever used the design-token
system (`frontend/src/theme/tokens.js`) — not even the legacy `var C` proxy
object that Phase 4 retired everywhere else. That's 14 files, ~384 literal
hex/rgba color occurrences, the largest untokenized surface left in the
codebase — and it's the live game-day surface real coaches use during real
games, sitting behind two separate Locked-File gate phrases. This story
migrates it slice-by-slice (one file, or a small bundle of trivial files,
per slice) onto a new `color.gameDay.*` token namespace, mechanically and
without changing any rendered pixel.

## 2. Current state (verify this yourself before trusting it — see §7)

| Slice | File(s) | Occurrences | Status |
|---|---|---|---|
| 1 | `BenchStrip.jsx` + `ScoreboardRow.jsx` | 10 | **Merged** (PR #705, `f451c8f`→`0b020fc`) |
| 2 | `DugoutView.jsx` | 7 (10 sites) | **Merged** (PR #707, `00bb650`→`a6aba75`) |
| 3 | `DiamondView.jsx` | 26 occurrences / 19 sites | **Merged** (PR #709, `2ec8ea6`→`af8e656`) |
| 4 | `QuickSwap.jsx` | 20 | **Branch cut, zero commits** — `feature/story133-slice4-quickswap-token-migration`, forked clean from `origin/develop` |
| 5 | `GameModeScreen.jsx` | 33 | Not started |
| 6 | `InningModal.jsx` | 45 | Not started — largest in `game-mode/*` |
| 7-13 | `ScoringMode/*` (7 files) | 251 total | Not started — separate Locked-File track, see §5 |

**`develop` is currently at `af8e656`** (post-slice-3-merge). Confirm this
is still current with `git log origin/develop -1` — multiple concurrent
sessions have been active on this repo tonight (see §6), so don't assume
this number is still accurate by the time you read it.

**Both worktrees, as last verified:**
- `lineup_generator` → `develop` @ `af8e656` (or later)
- `lineup-generator-ux` → `feature/story133-slice4-quickswap-token-migration`, forked from `develop` @ `af8e656`, 0 commits ahead

**Gate phrases already granted for this session** (confirm still valid —
these are per-conversation, not permanent): `"all clear — game-mode editing
approved"` and `"all clear — ScoringMode editing approved"`. If you're a
fresh agent in a new conversation, **you do not have these yet** — ask KK
for them before touching any file under either directory. Do not assume a
prior grant carries over.

## 3. The established per-slice workflow — follow exactly

This exact sequence has now run cleanly 3 times (slices 1-3). Don't
improvise a different one.

1. **Confirm which worktree is free.** Check `git worktree list` — don't
   assume either worktree is idle. If both are in active use by other
   sessions, wait or ask KK. Never force a branch switch on a worktree with
   uncommitted changes without checking first.
2. **Fork the slice branch from clean `origin/develop`**, not from local
   `develop` (it may be stale) and not from whatever branch a worktree
   happens to be on:
   ```
   git fetch origin develop
   git checkout -b feature/story133-sliceN-<component>-token-migration origin/develop
   ```
3. **Inventory the file's literal colors:**
   ```
   grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" <file> | sort | uniq -c | sort -rn
   ```
4. **Propose the exact mapping to KK before writing anything to
   `tokens.js`.** For every value: state whether it's an exact match to an
   *existing* token (from any namespace, not just `gameDay.*` — see the
   `color.position.*` note in §4 below), or needs a new `gameDay.*` token.
   Never silently alias a light-surface token (`text.secondary`,
   `text.tertiary`, `border.default`, etc.) onto a dark game-day surface
   just because the hex happens to match — those tokens are calibrated for
   light surfaces specifically (see their own doc comments in `tokens.js`).
   Wait for explicit approval before editing `tokens.js`.
5. **Write `tokens.js` first**, then the component file. Every rgba/hex
   value gets its own dedicated token — do not collapse near-duplicate
   values (e.g. two different opacity tiers) without KK explicitly signing
   off on the collapse. Byte-preserving is the default; visual changes are
   the rare, explicit exception (and none have happened yet in slices 1-3
   — every single value so far has been an exact-preserving mint).
6. **Verify zero literal colors remain:**
   ```
   grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" <file>
   ```
   should return nothing.
7. **Build + test.** `npm run build` (frontend) must be clean. Run at
   minimum the touched file's own test (if one exists — not all of them
   do, see the `BenchStrip.jsx`/dead-code note in §4) plus
   `src/tests/theme.tokens.test.js`. Slices 1-3 have all run the broader
   `src/components/game-mode/` suite too (114/114 as of slice 3) — do the
   same.
8. **Commit message: no closing keyword.** Never write `closes #698` or
   `fixes #698` in any commit before slice 13's final one — **and even
   then, only after KK's full Game-Day Validation pass, not automatically
   on merge.** See §6 item 1 for exactly why this rule exists — it was
   violated once already (slice 1) and had to be recovered.
9. **Push, open PR against `develop`, base = `develop`.** Reference #698 in
   the body without a closing keyword. Do not mark it a draft unless you
   have a specific reason to (slice 3's PR was opened as draft then
   un-drafted before merge — no functional difference, just be consistent
   about which state it's actually in when you report status).
10. **Label the PR with all four categories before or immediately after
    opening it — this is now a mandatory pre-handoff checkpoint, not
    optional:** `priority:p2`, `type:refactor`, `area:game-mode` (or
    `area:scoring` for `ScoringMode/*` slices), and a `status:*` label
    (`status:ready-for-review` while CI is running, or similar — pick the
    one that actually reflects current state). **Slice 3's PR (#709)
    merged with zero labels** — caught and fixed after the fact. Don't
    repeat that; check labels are present *before* reporting a merge as
    complete.
11. **Wait for CI green on all checks** (Backend/Frontend tests, RLS suite,
    CodeQL, both Vercel previews — `line-up-generator` and
    `lineup-generator` are both real, both must pass).
12. **Merge.** Verify it's a genuine 2-parent merge afterward:
    ```
    git show -s --format="%H %P" origin/develop
    ```
    should show exactly 2 parent hashes. If GitHub squashed it despite the
    repo's "always create a merge commit" policy, that's a real problem —
    flag it, don't just move on.
13. **Post a visual/interaction checkpoint comment on #698** — this is a
    hard gate before starting the next slice, not optional documentation.
    See §4's auth-boundary note for how slices 1-3 actually verified this
    without completing a real login. Be as precise as slice 3's checkpoint
    comment (computed RGB values quoted exactly, not just "looks right") —
    that's now the bar.
14. **Sync both worktrees** to the new `develop` tip. Clean up the merged
    branch (usually auto-deleted on GitHub; delete the local one too:
    `git branch -d <branch>`).
15. **Stop. Do not start the next slice until KK explicitly says to.** This
    has been an explicit standing instruction since slice 1 — every slice
    so far has been individually gated, not just the token migration as a
    whole.

## 4. Critical technical context, discovered the hard way

- **`color.position.*` already exists and may be the right answer for some
  files, not `gameDay.diamond.position.*`.** `DiamondView.jsx` (slice 3)
  used the grouped battery/infield/outfield scheme, which correctly got
  its own `gameDay.diamond.position.*` sub-group. But `QuickSwap.jsx`
  (slice 4)'s literal-color inventory includes `#e05c2a`, `#7f3f3f`,
  `#2471a3`, `#2980b9`, `#6c3483`, `#8e44ad`, `#1e8449`, `#239b56` — these
  are **exact matches to the existing `color.position.{P,C,'1B','2B','3B',
  SS,LF,LC,RC,RF}` tokens** already in `tokens.js` (the per-position, not
  grouped, palette used elsewhere in the app). Check whether slice 4's
  position-badge colors should reuse `color.position.*` directly rather
  than minting a duplicate `gameDay.*` equivalent — this is exactly the
  kind of cross-namespace reuse check that needs doing *before* proposing
  new tokens, not after.
- **`BenchStrip.jsx` is dead code** — confirmed via a full-source grep
  during slice 1: it's imported nowhere in `frontend/src`, not even by
  `GameModeScreen.jsx`. It was still migrated correctly (zero risk, since
  nothing renders it), but there was nothing to visually verify for it —
  don't be surprised if other files in this migration turn out to be
  unreachable too; check with `grep -rln "<ComponentName>" frontend/src
  --include="*.jsx" | grep -v test` before assuming a visual check is
  possible for any given file.
- **The auth-testing boundary**: an agent will not complete a real
  magic-link/Google-OAuth login flow to reach an authenticated view,
  including via the Supabase service-role admin API to mint a session
  programmatically. This boundary has held for the entire migration so
  far. Two ways around it that *are* legitimate:
  - **Share-link routes need no auth at all** — `?share=<base64>&view=true`
    sits explicitly above the auth gate in `App.jsx` (comment: "MUST stay
    above the auth gate"). You can construct a synthetic payload directly
    (see `frontend/src/utils/buildSharePayload.js` for the exact shape:
    `{team, game, grid, batting, roster, absentNames, songs}`) and load
    `http://localhost:<port>/?share=<base64>&view=true` in Playwright with
    zero real data or login needed. This is how slice 2's viewer-placeholder
    checkpoint was verified with real computed-style evidence.
  - **For genuinely coach-only views** (most of `game-mode/*` and all of
    `ScoringMode/*`), either ask KK to log in himself and report back, or
    (untested but proposed) launch Chrome with remote debugging enabled and
    have Playwright attach via CDP after KK's own real login — never drive
    the login itself.
- **Run local dev in an isolated third location, never in either active
  worktree.** Both `lineup_generator` and `lineup-generator-ux` may be in
  active use by other sessions at any time (see §6). Create a throwaway
  `git worktree add <scratch-path> origin/develop --detach`, copy
  `backend/.env` + `frontend/.env` + `frontend/.env.development` from
  either real worktree into it (gitignored, no secret-exposure risk from a
  local copy), run backend on a non-default port (`PORT=3001 node
  index.js`) and frontend likewise (`npx vite --port 5180`), point
  `frontend/.env.development`'s `VITE_BACKEND_URL` at the alternate
  backend port. Clean up with `git worktree remove <path> --force` when
  done — **expect this to fail with "Permission denied" on Windows** (see
  §6 item 4); that's fine, the working files are still gone, just a
  metadata stub is left behind.
- **Playwright is already installed** at the `lineup_generator` root
  (`npm install --no-save playwright` + `npx playwright install
  chromium` were both run once already tonight) — but only in that one
  location's `node_modules`. A screenshot script run from a different
  directory needs to either be copied into `lineup_generator` temporarily
  or have its own `playwright` install.

## 5. Remaining slice plan

**`game-mode/*` track** (continues under the `game-mode/*` gate phrase):
5. `GameModeScreen.jsx` (33 occurrences) — the file the *original*,
   pre-scope-expansion ticket named. Confirmed live via 3 "Game Mode"
   buttons on ready team cards, Home tab (`App.jsx` ~lines 3017/3130/3152),
   independent of the DUGOUT VIEW launcher.
6. `InningModal.jsx` (45 occurrences) — largest file in this directory,
   sequenced last on purpose.

**`ScoringMode/*` track** (separate Locked-File gate phrase —
`"all clear — ScoringMode editing approved"` — needed even if the
`game-mode/*` one is already granted):
7. `LiveScoreViewer.jsx` (0 occurrences) — verification-only pass, confirm
   it's genuinely clean, not a real migration slice.
8. `GameModeGearMenu.jsx` (10)
9. `RunnerConflictModal.jsx` (12)
10. `RestoreScoreModal.jsx` (15)
11. `FinishGameModal.jsx` (16)
12. `ScoringModeEntry.jsx` (31)
13. `LiveScoringPanel.jsx` (167 occurrences, ~60KB file, by far the
    largest single file in the whole migration) — **will very likely need
    its own internal sub-slicing** (e.g. split into 2-3 separate PRs by
    logical section) rather than one giant diff. Plan for this explicitly
    when you get there rather than discovering it mid-flight.

**After slice 13:** full on-device Game-Day Validation pass (per root
`CLAUDE.md`'s own checklist — generate lineup, open Game Mode, advance an
inning, positions visible, batting order clear), then and only then close
`#698` — manually, by KK, not via a commit keyword.

## 6. Operational gotchas from tonight, don't relearn these

1. **A `closes #698` (or `fixes #698`) commit trailer will close the
   umbrella issue on merge, regardless of qualifying text like "(slice 1 of
   13)" — GitHub's keyword parser doesn't read qualifiers.** This happened
   once already (slice 1's PR #705) and had to be recovered: reopen via
   `gh issue reopen 698`, post a comment explaining what happened, and
   from then on never use a closing keyword again until the story is
   actually, fully done.
2. **Multiple concurrent agent sessions have been active on this machine
   across both worktrees tonight, unpredictably.** Branches have switched
   out from under an in-progress task at least twice (once, a commit
   intended for a feature branch landed on local `develop` because
   something else switched the worktree mid-task — recovered losslessly
   since `origin/develop`'s tip matched the commit's parent exactly, but it
   required noticing and fixing). **Always run `git branch --show-current`
   immediately before every commit**, not just at the start of a task.
   Never assume a worktree's branch hasn't changed since you last checked
   it.
3. **A separate, unrelated CORS fix (PR #706, merged) is on `develop`
   but not yet promoted to `main`** — it extends the backend's CORS
   allowlist to accept Vercel preview domains (previously only
   `dugoutlineup.com` + localhost were allowed, meaning **no Vercel
   preview has ever been able to reach the backend** — auth, team-loading,
   everything). This is unrelated to Story 133 but was discovered while
   trying to test a Story 133 slice on a Vercel preview. Full details:
   `backend/app.js`'s `ALLOWED_ORIGINS` + `VERCEL_PREVIEW_ORIGIN_RE`. If a
   future slice's Vercel-preview test still fails with "Network error",
   check whether this fix has reached `main` yet — the backend only
   deploys from `main`, and this fix landing on `develop` alone does not
   make it live for previews (there's no separate dev backend; every
   environment hits the same single Render service). It went through the
   **normal 24h soak**, no hotfix exception, per KK's explicit choice.
4. **`git worktree remove` reliably fails with "Permission denied" on
   Windows for scratch worktrees created and removed within the same
   session** (`.git/worktrees/<name>` metadata directory specifically,
   even after the actual working files are gone). This has happened
   repeatedly and is apparently a Windows file-locking quirk, not a real
   problem — `git worktree list` will correctly stop showing the scratch
   worktree once its files are gone, even though the stale metadata
   directory lingers. Don't keep retrying it; it's cosmetic, not a
   blocker. Leave it.
5. **A separate, unrelated git-config-corruption incident is being
   documented on a local-only `docs/git-config-corruption-incident`
   branch** (not yet pushed) by another concurrent process as of this
   writing. Unrelated to Story 133. Don't touch it; not investigated
   further here.
6. **No per-slice GitHub issues exist, and none should be created** — KK
   explicitly confirmed `#698` alone is the tracking issue for all 13
   slices (asked directly, 2026-08-18, chose "confirm #698's state" over
   "create a dedicated per-slice issue"). Don't second-guess this and
   start filing individual issues per slice.

## 7. Known doc staleness — fix opportunistically, not urgently

`docs/product/ROADMAP.md`'s own Story 133 entry (search for `### Story 133`)
still says **"Status: Open - scoped and phased, not started"** at the top,
even though slices 1-3 are merged. This handoff doc (and `#698`'s comment
log) are the current source of truth, not that line. Worth fixing next
time that section is touched, not urgent enough to block on.

---

## Quick-reference: exact commands for the next slice

```bash
# 1. Confirm state
cd C:/Users/kaush/OneDrive/Documents/Projects/lineup-generator-ux
git worktree list
git branch --show-current
git log origin/develop -1 --oneline

# 2. If branch already exists (e.g. slice 4 as of this writing):
git checkout feature/story133-slice4-quickswap-token-migration
git status --short   # should be clean, 0 commits ahead of develop

# 3. Inventory
grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" frontend/src/components/game-mode/QuickSwap.jsx | sort | uniq -c | sort -rn

# 4. Propose mapping to KK, wait for approval, THEN:
#    edit frontend/src/theme/tokens.js, then the component file

# 5. Verify
grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" frontend/src/components/game-mode/QuickSwap.jsx  # must be empty
cd frontend && npm run build
npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js

# 6. Commit (NO closing keyword), push, PR, label (all 4 categories), CI, merge, verify 2-parent, checkpoint comment on #698, sync worktrees, STOP
```
