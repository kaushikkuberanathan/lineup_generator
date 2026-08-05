/**
 * scorerLockIdentity.test.js
 *
 * DOC_TEST_DEBT.md P1 — "Live Scoring Scorer-Lock Regression" (opened 2026-04-17).
 *
 * CONTRACT: claimScorerLock() (and the write paths it triggers — the
 * heartbeat upsert and the audit-log insert) must never persist a
 * null/undefined scorer identity to Supabase. This is the v2.2.29 bug
 * shape: when the auth gate is down and no non-null identity reaches
 * useLiveScoring's `userId` param, the raw value flows straight into
 * `game_scoring_sessions.scorer_user_id` (text, NOT NULL) and the
 * upsert is rejected by the database constraint.
 *
 * IMPORTANT — where the real fix lives today (read the hook source
 * before touching this file): `_effectiveUserId = userId || null`
 * (useLiveScoring.js ~line 291) is a pure passthrough. It has NO
 * fallback value of its own. The hook briefly had one
 * ('admin-coach-mud-hens', v2.2.28) and paired null-guards on
 * audit()/startHeartbeat()/claimScorerLock()/releaseScorerLock()
 * (added v2.2.34), but both were removed in v2.2.37 once the call
 * site — now `DugoutView.jsx`'s `scoringUserId` (user.id ->
 * session.user.id -> a `scorer_local_id` UUID persisted in
 * localStorage, itself hardcoded-fallback-safe) — took over
 * guaranteeing a non-null value before the hook is ever invoked. See
 * frontend/src/data/versionHistory.js entries for v2.2.28/29/34/37.
 *
 * Practical consequence for this test file: there is no code path in
 * the shipped app today that invokes `claimScorerLock()` with a
 * null/undefined identity — DugoutView.jsx is the only caller of
 * `useLiveScoring`, and its fallback chain always resolves to a
 * truthy string, even with no session and even if localStorage
 * throws. So these tests model the two REAL invocation shapes
 * DugoutView can produce (a real authenticated user id, or the
 * local-device shim id) and assert the identity that reaches every
 * Supabase write tied to the scorer role is always exactly what was
 * resolved — never silently dropped to null/undefined. The mutation
 * check below (see PR description / session report) simulates the
 * v2.2.29 bug shape by making the hook's identity resolution ignore
 * whatever the caller supplied — reproducing "the resolved identity
 * is null no matter what a real caller passes in" — and confirms
 * these tests catch it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var MOCK_TEAM = { id: 'team-test' };

// ── Mocks — same per-table dispatch pattern as realtimeRaceGuard.test.js /
//    practiceModeIsolation.test.js ────────────────────────────────────────────

var mocks = vi.hoisted(function() {
  var lgsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var lgsBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: lgsUpsert,
  };
  lgsBuilder.select.mockReturnValue(lgsBuilder);
  lgsBuilder.eq.mockReturnValue(lgsBuilder);

  var gssUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var gssBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: gssUpsert,
    delete: vi.fn(),
  };
  gssBuilder.select.mockReturnValue(gssBuilder);
  gssBuilder.eq.mockReturnValue(gssBuilder);
  gssBuilder.delete.mockReturnValue(gssBuilder);

  var auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var auditBuilder = { insert: auditInsert };

  var channelObj = { on: vi.fn(), subscribe: vi.fn() };
  channelObj.on.mockReturnValue(channelObj);
  channelObj.subscribe.mockReturnValue(channelObj);

  var client = {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue(channelObj),
    removeChannel: vi.fn(),
  };
  client.from.mockImplementation(function(table) {
    if (table === 'live_game_state')       return lgsBuilder;
    if (table === 'game_scoring_sessions') return gssBuilder;
    return auditBuilder; // scoring_audit_log
  });

  return {
    client,
    lgsUpsert, lgsBuilder,
    gssUpsert, gssBuilder,
    auditInsert, auditBuilder,
    channelObj,
  };
});

vi.mock('../supabase', function() {
  return { supabase: mocks.client };
});

vi.mock('../utils/leagueRules', function() {
  return {
    getRulesForTeam:   vi.fn().mockReturnValue({ id: 'test-rules' }),
    getPitchUIConfig:  vi.fn().mockReturnValue({}),
    processPitch:      vi.fn().mockReturnValue({
      balls: 0, strikes: 0, attempts: 0, coachPitchesRemaining: 0,
      isCoachPitching: false, warnings: [], isResolved: false,
    }),
    validateSteal:     vi.fn(),
    isRunLimitReached: vi.fn().mockReturnValue(false),
    PITCH_TYPE:        {},
    AT_BAT_RESULT:     { WALK: 'walk', STRIKEOUT: 'strikeout', OUT_ATTEMPTS: 'out_attempts' },
  };
});

import { useLiveScoring } from '../hooks/useLiveScoring.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Non-practice, real-game hook params — matches how DugoutView.jsx invokes
// useLiveScoring (isEnabled true, gameId/teamId set, isPractice false/omitted).
function hookParams(overrides) {
  return Object.assign(
    { gameId: 'g1', teamId: 't1', isEnabled: true, team: MOCK_TEAM },
    overrides || {}
  );
}

async function mountAndClaim(overrides) {
  var h = await renderHook(function() {
    return useLiveScoring(hookParams(overrides));
  });
  await act(async function() {
    h.result.current.claimScorerLock();
  });
  return h;
}

describe('Scorer-lock identity — never null/undefined scorer_user_id (DOC_TEST_DEBT P1)', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.lgsUpsert.mockResolvedValue({ data: null, error: null });
    mocks.lgsBuilder.select.mockReturnValue(mocks.lgsBuilder);
    mocks.lgsBuilder.eq.mockReturnValue(mocks.lgsBuilder);
    mocks.lgsBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.gssUpsert.mockResolvedValue({ data: null, error: null });
    mocks.gssBuilder.select.mockReturnValue(mocks.gssBuilder);
    mocks.gssBuilder.eq.mockReturnValue(mocks.gssBuilder);
    mocks.gssBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.gssBuilder.delete.mockReturnValue(mocks.gssBuilder);
    mocks.auditInsert.mockResolvedValue({ data: null, error: null });
    mocks.channelObj.on.mockReturnValue(mocks.channelObj);
    mocks.channelObj.subscribe.mockReturnValue(mocks.channelObj);
    mocks.client.channel.mockReturnValue(mocks.channelObj);
    mocks.client.from.mockImplementation(function(table) {
      if (table === 'live_game_state')       return mocks.lgsBuilder;
      if (table === 'game_scoring_sessions') return mocks.gssBuilder;
      return mocks.auditBuilder;
    });
  });

  afterEach(function() {
    vi.useRealTimers();
  });

  // ── Test 1: real authenticated user ─────────────────────────────────────────

  it('1: claimScorerLock — real authenticated userId reaches scorer_user_id, non-null', async function() {
    var h = await mountAndClaim({ userId: 'auth-951f66cc-afec', userName: 'Kaushik K' });

    expect(mocks.gssUpsert).toHaveBeenCalled();
    var payload = mocks.gssUpsert.mock.calls[0][0];
    expect(payload.scorer_user_id).toBe('auth-951f66cc-afec');
    expect(payload.scorer_user_id).not.toBeNull();
    expect(payload.scorer_user_id).not.toBeUndefined();

    await h.unmount();
  });

  // ── Test 2: no real login — local-device shim identity (DugoutView's
  //    scorer_local_id fallback) ───────────────────────────────────────────────

  it('2: claimScorerLock — local-device shim id (no login) reaches scorer_user_id, non-null', async function() {
    var SHIM_ID = 'xxxxxxxx-xxxx-4xxx-yxxx-shimlocalid01';
    var h = await mountAndClaim({ userId: SHIM_ID, userName: 'Coach' });

    var payload = mocks.gssUpsert.mock.calls[0][0];
    expect(payload.scorer_user_id).toBe(SHIM_ID);
    expect(payload.scorer_user_id).not.toBeNull();
    expect(payload.scorer_user_id).not.toBeUndefined();

    await h.unmount();
  });

  // ── Test 3: audit trail carries the same resolved identity ─────────────────

  it('3: claimScorerLock — audit log actor_user_id matches the same resolved identity, never diverges', async function() {
    var h = await mountAndClaim({ userId: 'auth-951f66cc-afec', userName: 'Kaushik K' });

    expect(mocks.auditInsert).toHaveBeenCalled();
    var auditPayload = mocks.auditInsert.mock.calls[0][0];
    expect(auditPayload.actor_user_id).toBe('auth-951f66cc-afec');
    expect(auditPayload.actor_user_id).not.toBeNull();

    await h.unmount();
  });

  // ── Test 4: heartbeat re-upserts the same non-null identity ────────────────

  it('4: heartbeat — 20s tick re-upserts scorer_user_id, still non-null and unchanged', async function() {
    var h = await mountAndClaim({ userId: 'auth-951f66cc-afec', userName: 'Kaushik K' });
    mocks.gssUpsert.mockClear();

    await act(async function() {
      vi.advanceTimersByTime(20000);
    });

    expect(mocks.gssUpsert).toHaveBeenCalled();
    var payload = mocks.gssUpsert.mock.calls[0][0];
    expect(payload.scorer_user_id).toBe('auth-951f66cc-afec');
    expect(payload.scorer_user_id).not.toBeNull();

    await h.unmount();
  });

});
