#!/usr/bin/env node
'use strict';

require('../src/lib/env');

const readline = require('readline');
const { supabaseAdmin } = require('../src/lib/supabase');
const { normalizePhone } = require('../src/lib/phone');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt) {
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));
}

async function main() {
  console.log('\n=== Seed Admin Membership ===\n');

  const rawPhone = await ask('Your phone number: ');

  let phone;
  try {
    phone = normalizePhone(rawPhone);
    console.log(`  Normalized: ${phone}`);
  } catch {
    console.error('  Invalid phone number. Accepted formats: (404) 555-0123 | 4045550123 | +14045550123');
    rl.close();
    process.exit(1);
  }

  const teamId = await ask(
    'Team ID (UUID) — you can enter any placeholder like aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee for now: '
  );

  console.log('\nInserting admin membership...');

  const { data, error } = await supabaseAdmin
    .from('team_memberships')
    .insert({
      phone_e164: phone,
      team_id: teamId,
      role: 'admin',
      status: 'invited',
      user_id: null,
    })
    .select()
    .single();

  if (error) {
    console.error('\nInsert failed:', error.message);
    rl.close();
    process.exit(1);
  }

  console.log('\nInserted row:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nDone. Run npm run test:auth to complete the OTP login flow.\n');

  rl.close();
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  rl.close();
  process.exit(1);
});
