#!/usr/bin/env node
'use strict';

const readline = require('readline');

const BASE_URL = 'http://localhost:3000/api/v1/auth';

// ─── readline helpers ─────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt) {
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));
}

function waitForEnter(message) {
  return new Promise((resolve) => rl.question(message, () => resolve()));
}

// ─── fetch helper ─────────────────────────────────────────────────────────────

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function get(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ─── main flow ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Auth Flow Test ===\n');

  // Step 1 — get phone number
  const phone = await ask('Enter a test phone number (e.g. (404) 555-0123): ');

  // Step 2 — POST /request-access
  console.log('\n[1/4] POST /request-access');
  const requestRes = await post('/request-access', { firstName: 'Test', lastName: 'User', phone });
  console.log(`  Status : ${requestRes.status}`);
  console.log(`  Body   :`, requestRes.body);

  // Step 4 — pause for admin approval
  await waitForEnter(
    '\nNow go approve this request in the admin UI or via Supabase Studio, then press Enter here to continue\n'
  );

  // Step 6 — POST /login
  console.log('[2/4] POST /login');
  const loginRes = await post('/login', { phone });
  console.log(`  Status : ${loginRes.status}`);
  console.log(`  Body   :`, loginRes.body);

  if (loginRes.status !== 200) {
    console.error('\n  Login failed — stopping here.');
    rl.close();
    process.exit(1);
  }

  // Step 8 — get OTP
  const otp = await ask('\nEnter the 6-digit OTP you received via text: ');

  // Step 10 — POST /verify
  console.log('\n[3/4] POST /verify');
  const verifyRes = await post('/verify', { phone, token: otp });
  console.log(`  Status : ${verifyRes.status}`);
  console.log(`  Body   :`, JSON.stringify(verifyRes.body, null, 2));

  if (verifyRes.status !== 200) {
    console.error('\n  Verify failed — stopping here.');
    rl.close();
    process.exit(1);
  }

  const accessToken = verifyRes.body?.session?.access_token;
  if (!accessToken) {
    console.error('\n  No access_token in verify response — cannot call /me.');
    rl.close();
    process.exit(1);
  }

  // Step 12 — GET /me
  console.log('[4/4] GET /me');
  const meRes = await get('/me', accessToken);
  console.log(`  Status : ${meRes.status}`);
  console.log(`  Body   :`, JSON.stringify(meRes.body, null, 2));

  console.log('\n=== Flow complete ===\n');
  rl.close();
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  rl.close();
  process.exit(1);
});
