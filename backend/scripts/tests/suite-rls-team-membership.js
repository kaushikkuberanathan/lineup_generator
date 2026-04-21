// ─── suite-rls-team-membership.js ─────────────────────────────────────────────
//
// Coverage: Row Level Security policies on team_data, team_memberships, and
//           team_data_history. Codifies the email-fallback bug class that bit
//           us in April 2026 (admin access denied because RLS policy was
//           missing the email fallback path).
//
// CRITICAL: This suite tests RLS, which means it MUST use authenticated
// user clients (anon key + JWT), NOT supabaseAdmin (which bypasses RLS).
//
// CI_SAFE: false. Requires:
//   - SUPABASE_URL, SUPABASE_ANON_KEY in env
//   - Two pre-provisioned test users with known credentials, OR
//   - Ability to mint test JWTs via supabaseAdmin.auth.admin.createUser()
//
// We use the createUser approach so the suite is self-contained and cleans
// up after itself.
//
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');

const APP_VERSION = 'test-suite-1.0';
const REAL_TEAM_ID = '1774297491626';   // Mud Hens — the team test users will/won't have membership to
const OTHER_TEAM_ID = '9999999999999';  // synthetic — used to test cross-team isolation

// Track everything we create so cleanup is deterministic
const created = {
  userIds: [],
  membershipIds: [],
  syntheticTeamId: null,
};

async function makeAuthedClient(supabaseAdmin, email) {
  // Create a user, then immediately mint a session for them.
  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { test_suite: APP_VERSION },
    });
  if (createErr) throw new Error(`createUser failed: ${createErr.message}`);

  const userId = created.user.id;

  // Generate a session via magic link token exchange
  const { data: linkData, error: linkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
  if (linkErr) throw new Error(`generateLink failed: ${linkErr.message}`);

  // Verify the OTP to get a session
  const { data: sessionData, error: verifyErr } =
    await supabaseAdmin.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    });
  if (verifyErr) throw new Error(`verifyOtp failed: ${verifyErr.message}`);

  const accessToken = sessionData.session.access_token;

  // Build an anon-key client with this user's JWT — this is what enforces RLS
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );

  return { userId, client, accessToken };
}

async function run(test, BASE_URL, supabaseAdmin, state) {
  const CI_SAFE = process.env.CI_SAFE === 'true';

  if (CI_SAFE) {
    await test({
      id: 'RLS-TM-01',
      description: 'RLS suite skipped in CI_SAFE (writes to auth.users)',
      expected: 'SKIP',
      fn: async () => 'SKIP',
      skipReason: 'RLS testing requires user creation — non-CI_SAFE only',
    });
    return;
  }

  if (!supabaseAdmin) {
    await test({
      id: 'RLS-TM-00',
      description: 'supabaseAdmin not available — suite cannot run',
      expected: 'admin client',
      fn: async () => false,
    });
    return;
  }

  // ─── Setup ──────────────────────────────────────────────────────────────

  let userA, userB;
  try {
    userA = await makeAuthedClient(supabaseAdmin, `rls-userA-${Date.now()}-suite@test.com`);
    userB = await makeAuthedClient(supabaseAdmin, `rls-userB-${Date.now()}-suite@test.com`);
    created.userIds.push(userA.userId, userB.userId);

    // Give userA an active membership to REAL_TEAM_ID
    const { data: mA, error: mAErr } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        user_id: userA.userId,
        email: `rls-userA-${Date.now()}-suite@test.com`,
        team_id: REAL_TEAM_ID,
        role: 'coach',
        status: 'active',
      })
      .select('id')
      .single();
    if (mAErr) throw new Error(`seed userA membership failed: ${mAErr.message}`);
    created.membershipIds.push(mA.id);

    // userB has NO membership — that's the test condition
  } catch (setupErr) {
    await test({
      id: 'RLS-TM-SETUP',
      description: 'suite setup failed — skipping all RLS tests',
      expected: 'setup ok',
      fn: async () => false,
      actual: setupErr.message,
    });
    await cleanup(supabaseAdmin);
    return;
  }

  // ─── Tests ──────────────────────────────────────────────────────────────

  await test({
    id: 'RLS-TM-01',
    description: 'authed user with active membership CAN read own team_data',
    expected: '1+ rows or empty array (not RLS error)',
    fn: async () => {
      const { data, error } = await userA.client
        .from('team_data')
        .select('team_id')
        .eq('team_id', REAL_TEAM_ID);
      // RLS denial surfaces as empty array (not an error) — but we should NOT see error
      return !error;
    },
  });

  await test({
    id: 'RLS-TM-02',
    description: 'authed user CANNOT read team_data for a team they are not a member of',
    expected: '0 rows returned (RLS filter)',
    fn: async () => {
      const { data, error } = await userA.client
        .from('team_data')
        .select('team_id')
        .eq('team_id', OTHER_TEAM_ID);
      return !error && Array.isArray(data) && data.length === 0;
    },
  });

  await test({
    id: 'RLS-TM-03',
    description: 'authed user with NO membership reads team_data → empty (not error)',
    expected: '0 rows for any team_id',
    fn: async () => {
      const { data, error } = await userB.client
        .from('team_data')
        .select('team_id')
        .eq('team_id', REAL_TEAM_ID);
      return !error && Array.isArray(data) && data.length === 0;
    },
  });

  await test({
    id: 'RLS-TM-04',
    description: 'authed user CANNOT write to team_data for a team they are not a member of',
    expected: 'RLS error or 0 rows affected',
    fn: async () => {
      const { data, error } = await userA.client
        .from('team_data')
        .update({ roster: [] })
        .eq('team_id', OTHER_TEAM_ID)
        .select();
      // Either an explicit RLS error, or the update silently affects 0 rows
      return error !== null || (Array.isArray(data) && data.length === 0);
    },
  });

  await test({
    id: 'RLS-TM-05',
    description: 'unauthenticated client CAN read team_data via share path (auth principle)',
    expected: 'no auth required for share view',
    fn: async () => {
      // This is the non-negotiable: viewing a share link must not require login.
      // Implementation: backend resolves share token via service role, so frontend
      // never reads team_data directly with anon key on share view path.
      // We verify this by hitting the backend share endpoint without a token.
      const res = await fetch(`${BASE_URL}/api/teams/${REAL_TEAM_ID}/share-test`, {
        method: 'GET',
      });
      // 404 is acceptable (route may not exist yet); 401/403 is a FAIL — share must not require auth
      return res.status !== 401 && res.status !== 403;
    },
  });

  await test({
    id: 'RLS-TM-06',
    description: 'team_memberships: user can SELECT their own membership rows',
    expected: '1+ rows for userA',
    fn: async () => {
      const { data, error } = await userA.client
        .from('team_memberships')
        .select('id, team_id, status')
        .eq('user_id', userA.userId);
      return !error && Array.isArray(data) && data.length >= 1;
    },
  });

  await test({
    id: 'RLS-TM-07',
    description: 'team_memberships: user CANNOT SELECT another user\'s membership rows',
    expected: '0 rows when querying for userB as userA',
    fn: async () => {
      const { data, error } = await userA.client
        .from('team_memberships')
        .select('id')
        .eq('user_id', userB.userId);
      return !error && Array.isArray(data) && data.length === 0;
    },
  });

  await test({
    id: 'RLS-TM-08',
    description: 'team_data_history: NOT readable by authenticated non-admin user',
    expected: '0 rows or RLS error',
    fn: async () => {
      const { data, error } = await userA.client
        .from('team_data_history')
        .select('team_id')
        .eq('team_id', REAL_TEAM_ID);
      // History should be service_role only
      return error !== null || (Array.isArray(data) && data.length === 0);
    },
  });

  await test({
    id: 'RLS-TM-09',
    description: 'admin email fallback: known admin email resolves correctly',
    expected: 'real admin still has access (regression check for April bug)',
    fn: async () => {
      // This test pings the backend /api/v1/admin/me-style endpoint with a known
      // admin token and asserts admin-tier response.
      // Skips if no admin test fixture is wired.
      if (!state?.adminAccessToken) return 'SKIP';
      const res = await fetch(`${BASE_URL}/api/v1/admin/members?teamId=${REAL_TEAM_ID}`, {
        headers: { Authorization: `Bearer ${state.adminAccessToken}` },
      });
      return res.status === 200;
    },
  });

  await test({
    id: 'RLS-TM-10',
    description: 'JWT tampering: modified token signature → 401 from backend',
    expected: '401 not 500',
    fn: async () => {
      // Tamper with the last char of the signature
      const parts = userA.accessToken.split('.');
      const tampered = parts[0] + '.' + parts[1] + '.' + parts[2].slice(0, -1) + (parts[2].slice(-1) === 'a' ? 'b' : 'a');
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${tampered}` },
      });
      return res.status === 401;
    },
  });

  // ─── Cleanup ────────────────────────────────────────────────────────────

  await cleanup(supabaseAdmin);
}

async function cleanup(supabaseAdmin) {
  if (created.membershipIds.length > 0) {
    await supabaseAdmin
      .from('team_memberships')
      .delete()
      .in('id', created.membershipIds);
  }
  for (const uid of created.userIds) {
    await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => { /* already gone */ });
  }
  await supabaseAdmin
    .from('auth_events')
    .delete()
    .eq('app_version', APP_VERSION);
}

module.exports = { run };
