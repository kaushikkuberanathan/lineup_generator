# Lineup Generator — Test Suite (`src/tests/`)

Regression tests for the V2 lineup engine, scoring, feature flags, Supabase
persistence helpers, and other frontend utilities. This directory is one of
two test locations in the frontend — `src/tests/` (utility/engine-level
specs, Vitest) and `src/__tests__/` (App-level component/golden-path specs).
For the full suite total and the actively-maintained description table of
the highest-traffic files, see `frontend/CLAUDE.md` → **## Test Suite**
(that doc, not this one, carries the current pass/skip count — don't copy a
number from here, it goes stale independently).

---

## Running Tests

```bash
# From frontend/
npm test           # Single run (CI)
npm run test:watch # Watch mode (dev)
npm run test:ui    # Browser UI (vitest --ui)
```

---

## Test Files

As of 2026-08-23, `src/tests/` contains **42 spec files** (up from the 2 this
doc previously listed — that inventory was years of accretion out of date).
Rather than duplicate a per-file description table that will drift again,
the current file list is:

```
accessibility.v1.test.js       dbSnapshotRoster.test.js         realtimeRaceGuard.test.js
attendance.test.js             engine.v2.test.js                runnerAdvancement.test.js
auth.test.js                   finalizeSchedule.test.js         runnerPlacement.test.js
bench-equity.test.js           flag-bootstrap.test.js           scheduleIntegrity.test.js
boot-merge.test.js             formatters.test.js               scorerLockIdentity.test.js
coachPitching.test.js          gameHeader.test.js               scoring.test.js
countFromPitches.test.js       leagueRules.test.js              scoringModeEntry.upcoming.test.js
dbDeleteTeam.test.js           lineupEngineV2-unit.test.js       scoringSheetV2.test.js
dbGetRosterSnapshots.test.js   liveStateMerge.test.js            season.adminHtmlParity.test.js
dbLoadTeamData.test.js         migration.test.js                season.test.js
dbLoadTeams.test.js            newGameTemplate.test.js           shareLink.test.js
dbSaveShareLink.test.js        opponentNameLabel.test.js         teamCreationPersistence.test.js
dbSaveTeamData.test.js         practiceModeIsolation.test.js     theme.tokens.test.js
dbSaveTeams.test.js                                              undoHalfInning.test.js
                                                                  useAuth.refreshMemberships.test.js
                                                                  useAuth.requestAccess.test.js
                                                                  useAuth.updateProfileName.test.js
                                                                  useBackendHealth.test.js
                                                                  useFeatureFlags.test.js
                                                                  useLiveScore.contract.test.js
```

Fixtures live in `src/tests/fixtures/` (`mockRoster.js`, `mockConfig.js`).

For descriptions of the engine/scoring/flag-critical subset, see
`frontend/CLAUDE.md` → Test Suite → **Test files** table.

---

## engine.v2.test.js — Groups

| Group | What it covers |
|-------|---------------|
| **1 — Position assignment** | Correct number of field slots per inning; LC/RC present; CF absent; no duplicate position in one inning; every player fields at least once |
| **2 — Bench slot correctness** | Bench count matches computed formula; no player both benched and fielded in same inning; under-strength rosters produce a warning |
| **3 — battingPerf key format** | `battingOrder` array uses full `player.name` strings — guards against stat-wipe bug from key format mismatches |
| **4 — Fallback guard** | Engine always reports `usedFallback: false`; documents the tech-debt risk that V1 fallback in `App.jsx` is silent |
| **5 — Output shape stability** | Required keys present with correct types; engine is deterministic (two identical runs produce identical output) |

---

## accessibility.v1.test.js — Groups

| Group | What it covers |
|-------|---------------|
| **1 — POSITION_LABELS** | Object shape, all values non-empty strings, covers all 11 engine positions (P C 1B 2B 3B SS LF LC RC RF Bench), known label values correct |
| **2 — FEATURE_FLAGS registry** | ACCESSIBILITY_V1 present and defaults to `true` (GA default-on — verify against `featureFlags.js` before assuming `false`); other current flags untouched |
| **3 — isFlagEnabled defaults** | Returns correct default for each flag; returns false for unknown flag names |
| **4 — isFlagEnabled localStorage override** | `"true"` activates a default-off flag; `"false"` suppresses a default-on flag; `removeItem` restores default; unrelated keys don't interfere; arbitrary strings (`"1"`, `"yes"`) fall back to default |

**Rule:** any change to `src/config/featureFlags.js` or `src/constants/positions.js`
must pass `npm test` before commit.

---

## Known Skip

**Correction (2026-08-23):** this section previously described a
`engine.v2.test.js` Test 2.3 bug (`activePlayers.length < Math.min(...)`
instead of `activePlayers.length < FIELD_POSITIONS.length`) as an open,
intentionally-failing test. **That comparison in `lineupEngineV2.js` (line
~92) is already the correct, fixed form** — the bug this section described
no longer exists in the code, and `engine.v2.test.js` has no known-failing
test today. The claim was stale, not re-verified against source before now.

The actual current known skip, per `frontend/CLAUDE.md` → Test Suite: **`bench-equity.test.js` test 2.1** (bench rotation fairness) — with identical players, sit-count can drift by more than 1 inning. Confirmed bug, fix deferred. See that file for the specific assertion.

---

## Adding a New Regression Test

When a bug is fixed:

1. **Locate the test group** that covers the area (or add a new group if needed).
2. **Write a failing test first** against the unfixed code, confirm it fails with a clear message (RED). This is a required deliverable — see `frontend/CLAUDE.md` → Test Suite → RED Checkpoint for the full discipline, including the mutation-test substitute when a stash-based RED check isn't possible.
3. **Apply the fix**, confirm the test passes (GREEN).
4. **Remove any `// BUG CONFIRMED` comment** from the test once the fix is verified.
5. Run the full suite (`npm test`) before committing — all tests must pass.

### Test file conventions

```js
describe('Group N — Short description', () => {
  test('N.M: plain-english description of the invariant', () => {
    // Arrange
    const result = generateLineupV2(mockRoster, mockConfig.innings);
    // Assert
    expect(result.someField).toBe(expectedValue);
  });
});
```

Use `// BUG CONFIRMED: [description] — fix in separate session` when a test is intentionally
left failing to document a known issue.
