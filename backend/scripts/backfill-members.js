/**
 * Backfill script: pre-creates team_memberships rows for existing users
 * so they are approved before the auth gate goes live.
 *
 * Usage: node scripts/backfill-members.js
 * Requires: DEFAULT_TEAM_ID in environment
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { supabaseAdmin } = require('../src/lib/supabase');
const { normalizePhone, maskPhone } = require('../src/lib/phone');

const CSV_PATH = path.join(__dirname, 'existing-users.csv');
const DEFAULT_TEAM_ID = process.env.DEFAULT_TEAM_ID;

if (!DEFAULT_TEAM_ID) {
  console.error('ERROR: DEFAULT_TEAM_ID environment variable is not set.');
  process.exit(1);
}

async function main() {
  let csvContent;
  try {
    csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  } catch (err) {
    console.error(`ERROR: Could not read ${CSV_PATH}`);
    console.error(err.message);
    process.exit(1);
  }

  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Read ${rows.length} rows from ${CSV_PATH}\n`);

  let inserted = 0;
  let skipped = 0;
  let errored = 0;

  for (const row of rows) {
    const { first_name, last_name, phone, role: rawRole } = row;
    const role = rawRole?.trim() || 'coach';

    // Normalize phone
    let phoneE164;
    try {
      phoneE164 = normalizePhone(phone);
    } catch (err) {
      console.warn(`WARN  [invalid phone] "${phone}" (${first_name} ${last_name}) — skipping`);
      errored++;
      continue;
    }

    // Check for existing membership
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('team_memberships')
      .select('id')
      .eq('phone_e164', phoneE164)
      .maybeSingle();

    if (lookupError) {
      console.error(`ERROR [lookup] ${maskPhone(phoneE164)} — ${lookupError.message}`);
      errored++;
      continue;
    }

    if (existing) {
      console.log(`SKIP  already exists: ${maskPhone(phoneE164)} (${first_name} ${last_name})`);
      skipped++;
      continue;
    }

    // Insert new membership
    const { error: insertError } = await supabaseAdmin.from('team_memberships').insert({
      phone_e164: phoneE164,
      team_id: DEFAULT_TEAM_ID,
      role,
      status: 'invited',
      user_id: null,
    });

    if (insertError) {
      console.error(`ERROR [insert] ${maskPhone(phoneE164)} (${first_name} ${last_name}) — ${insertError.message}`);
      errored++;
      continue;
    }

    console.log(`OK    inserted: ${maskPhone(phoneE164)} (${first_name} ${last_name}, role=${role})`);
    inserted++;
  }

  console.log(`
─────────────────────────────
 Inserted : ${inserted}
 Skipped  : ${skipped}
 Errored  : ${errored}
 Total    : ${rows.length}
─────────────────────────────`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
