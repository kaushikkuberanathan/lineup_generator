const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'migrations', '035_account_read_model_rpc.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('migration 035 Account read-model isolation contract (#1133)', () => {
  test('filters active memberships by the authenticated user id or normalized email', () => {
    assert.match(sql, /status\s*=\s*'active'/i);
    assert.match(sql, /user_id\s*=\s*p_user_id\s+OR\s+email\s*=\s*p_email/i);
  });

  test('selects teams only through the caller membership set', () => {
    assert.match(sql, /WHERE\s+t\.id\s+IN\s*\(SELECT\s+team_id\s+FROM\s+member_team_ids\)/i);
  });

  test('does not expose the service-role RPC to browser database roles', () => {
    assert.match(sql, /SECURITY\s+INVOKER/i);
    assert.match(sql, /REVOKE\s+ALL[^;]+FROM\s+PUBLIC,\s*anon,\s*authenticated/i);
    assert.match(sql, /GRANT\s+EXECUTE[^;]+TO\s+service_role/i);
  });

  test('never selects screen-owned roster, schedule, lineup, or scoring data', () => {
    assert.doesNotMatch(sql, /public\.team_data/i);
    assert.doesNotMatch(sql, /public\.live_game_state/i);
    assert.doesNotMatch(sql, /public\.scoring_audit_log/i);
  });
});
