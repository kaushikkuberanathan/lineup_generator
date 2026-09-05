const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('feature_flags team scope accepts canonical text team ids (#1137)', () => {
  const migration = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20260905151910_feature_flags_team_id_text.sql'), 'utf8');
  assert.match(migration, /alter\s+column\s+team_id\s+type\s+text/i);
  assert.match(migration, /using\s+team_id::text/i);
});
