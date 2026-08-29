// backend/src/__tests__/rls/authEventsMagicLinkType.test.js
//
// Regression suite for #736 / migration 027.
//
// auth_events.event_type's CHECK constraint (set by hand in Supabase, not
// tracked in either migration tree) predates the v2.1.0 OTP→magic-link
// switch and never allowed 'magic_link_requested' — every POST /magic-link
// audit-event insert has been silently rejected since v2.1.0 (logAuthEvent()
// swallows the error; login itself is unaffected). Migration 027 widens the
// constraint to add it.
//
// This needs a real Postgres CHECK-constraint evaluation — the hermetic
// unit suite monkey-patches supabaseAdmin.from() entirely (see
// loginLimiter.test.js / auth.happy.test.js), which never touches Postgres
// and so can never have caught this in the first place. Real client only,
// same reasoning as writeSourceRoleFallback.test.js.

const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');

// require('./clients') itself calls assertDevProject() at module load — this
// suite is structurally incapable of running against prod, same guard every
// other RLS spec in this directory relies on.
const { adminClient } = require('./clients');

const TEST_TEAM_ID = 'zzz-rls-test-auth-events-magic-link';

async function teardown(admin) {
  await admin.from('auth_events').delete().eq('team_id', TEST_TEAM_ID);
}

describe('AEML — auth_events allows magic_link_requested (#736 / migration 027)', () => {
  let admin;

  after(async () => {
    if (admin) await teardown(admin);
  });

  test('AEML1: inserting event_type=magic_link_requested succeeds against a real auth_events CHECK constraint', async () => {
    admin = adminClient();
    await teardown(admin);

    const res = await admin.from('auth_events').insert({
      team_id: TEST_TEAM_ID,
      event_type: 'magic_link_requested',
      auth_channel: 'email',
    });

    assert.equal(
      res.error, null,
      'REGRESSION (#736): expected magic_link_requested to be a valid event_type, got: ' +
      (res.error && res.error.message)
    );
  });
});
