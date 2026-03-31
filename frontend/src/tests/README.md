# Lineup Generator — Test Suite

Regression tests for the V2 lineup engine and Accessibility Phase 1 utilities.

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

| File | What it covers |
|------|---------------|
| `engine.v2.test.js` | V2 lineup engine: position assignment, bench correctness, batting order key format, fallback guard, output shape stability |
| `accessibility.v1.test.js` | Accessibility Phase 1: POSITION_LABELS completeness, isFlagEnabled defaults and localStorage overrides, ACCESSIBILITY_V1 flag registry |

Fixtures live in `src/tests/fixtures/`.

---

## engine.v2.test.js — Groups

| Group | What it covers |
|-------|---------------|
| **1 — Position assignment** | Correct number of field slots per inning; LC/RC present; CF absent; no duplicate position in one inning; every player fields at least once |
| **2 — Bench slot correctness** | Bench count matches computed formula; no player both benched and fielded in same inning; under-strength rosters produce a warning (regression for silent omission bug) |
| **3 — battingPerf key format** | `battingOrder` array uses full `player.name` strings — guards against stat-wipe bug from key format mismatches |
| **4 — Fallback guard** | Engine always reports `usedFallback: false`; documents the tech-debt risk that V1 fallback in `App.jsx` is silent |
| **5 — Output shape stability** | Required keys present with correct types; engine is deterministic (two identical runs produce identical output) |

---

## accessibility.v1.test.js — Groups

| Group | What it covers |
|-------|---------------|
| **1 — POSITION_LABELS** | Object shape, all values non-empty strings, covers all 11 engine positions (P C 1B 2B 3B SS LF LC RC RF Bench), known label values correct |
| **2 — FEATURE_FLAGS registry** | ACCESSIBILITY_V1 present and defaults to false; existing flags (USE_NEW_LINEUP_ENGINE, VIEWER_MODE, GAME_MODE) are untouched |
| **3 — isFlagEnabled defaults** | Returns correct default for each flag; returns false for unknown flag names |
| **4 — isFlagEnabled localStorage override** | `"true"` activates a default-off flag; `"false"` suppresses a default-on flag; `removeItem` restores default; unrelated keys don't interfere; arbitrary strings (`"1"`, `"yes"`) fall back to default |

**Rule:** any change to `src/config/featureFlags.js` or `src/constants/positions.js`
must pass `npm test` before commit.

---

## Known Failing Test (Confirmed Bug)

**Test 2.3 in engine.v2.test.js** fails intentionally — it documents a confirmed bug:

> With a 7-player roster (fewer than the 10 field positions), the engine assigns players and returns `warnings: []`. Three field positions are silently left unassigned each inning.

**Root cause:** The warning guard in `lineupEngineV2.js` compares
`activePlayers.length < Math.min(players.length, FIELD_POSITIONS.length)`
but should compare
`activePlayers.length < FIELD_POSITIONS.length`.

Do **not** fix this bug in this file — open a dedicated session so the fix can be verified in isolation.

---

## Adding a New Regression Test

When a bug is fixed:

1. **Locate the test group** that covers the area (or add a new group if needed).
2. **Write a failing test first** against the unfixed code, confirm it fails with a clear message.
3. **Apply the fix**, confirm the test passes.
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
