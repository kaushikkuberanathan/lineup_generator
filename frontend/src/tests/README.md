# Lineup Generator — Test Suite

Engine regression tests for the V2 lineup engine (`src/utils/lineupEngineV2.js`).

---

## Running Tests

```bash
# From frontend/
npm test           # Single run (CI)
npm run test:watch # Watch mode (dev)
npm run test:ui    # Browser UI (vitest --ui)
```

Tests live in `src/tests/engine.v2.test.js`.
Fixtures live in `src/tests/fixtures/`.

---

## Test Groups

| Group | What it covers |
|-------|---------------|
| **1 — Position assignment** | Correct number of field slots per inning; LC/RC present; CF absent; no duplicate position in one inning; every player fields at least once |
| **2 — Bench slot correctness** | Bench count matches computed formula; no player both benched and fielded in same inning; under-strength rosters produce a warning (regression for silent omission bug) |
| **3 — battingPerf key format** | `battingOrder` array uses full `player.name` strings — guards against stat-wipe bug from key format mismatches |
| **4 — Fallback guard** | Engine always reports `usedFallback: false`; documents the tech-debt risk that V1 fallback in `App.jsx` is silent |
| **5 — Output shape stability** | Required keys present with correct types; engine is deterministic (two identical runs produce identical output) |

---

## Known Failing Test (Confirmed Bug)

**Test 2.3** fails intentionally — it documents a confirmed bug:

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
