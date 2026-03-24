#!/usr/bin/env node
'use strict';

const readline = require('readline');

const BASE_URL = 'http://localhost:3000/api/v1';

// Placeholder team ID — replace with a real team UUID from your Supabase teams table
const PLACEHOLDER_TEAM_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// ─── readline helpers ─────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt) {
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));
}

// ─── fetch helpers ────────────────────────────────────────────────────────────

async function get(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function post(path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ─── main flow ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Admin Flow Test ===\n');

  // Step 1 — get admin token
  const token = await ask('Paste your admin Bearer token: ');

  // Step 2 — GET /admin/requests
  console.log('\n[1/3] GET /admin/requests?status=pending');
  const requestsRes = await get('/admin/requests?status=pending', token);
  console.log(`  Status : ${requestsRes.status}`);

  if (requestsRes.status !== 200) {
    console.error('  Request failed:', requestsRes.body);
    rl.close();
    process.exit(1);
  }

  const { requests, total } = requestsRes.body;

  // Step 3 — check for pending requests
  if (!requests || requests.length === 0) {
    console.log('  No pending access requests found. Nothing to approve.');
    rl.close();
    process.exit(0);
  }

  const first = requests[0];
  console.log(`  Total pending : ${total}`);
  console.log('  First request :');
  console.log(JSON.stringify(first, null, 2));

  // Step 4 — confirm approval
  const confirm = await ask('\nApprove this request? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Skipped. Exiting.');
    rl.close();
    process.exit(0);
  }

  // Step 5 — POST /admin/approve
  console.log('\n[2/3] POST /admin/approve');
  console.log(`  requestId : ${first.id}`);
  console.log(`  teamId    : ${PLACEHOLDER_TEAM_ID}  (placeholder — update PLACEHOLDER_TEAM_ID in this script)`);
  console.log(`  role      : coach`);

  const approveRes = await post('/admin/approve', token, {
    requestId: first.id,
    teamId: PLACEHOLDER_TEAM_ID,
    role: 'coach',
  });
  console.log(`  Status : ${approveRes.status}`);
  console.log(`  Body   :`, approveRes.body);

  if (approveRes.status !== 200) {
    console.error('  Approve failed — stopping here.');
    rl.close();
    process.exit(1);
  }

  // Step 7 — GET /admin/members
  console.log('\n[3/3] GET /admin/members');
  const membersRes = await get('/admin/members', token);
  console.log(`  Status : ${membersRes.status}`);
  console.log(`  Body   :`, JSON.stringify(membersRes.body, null, 2));

  console.log('\n=== Flow complete ===\n');
  rl.close();
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  rl.close();
  process.exit(1);
});
