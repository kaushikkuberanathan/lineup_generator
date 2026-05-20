#!/usr/bin/env node
/**
 * scripts/sync-stories-to-issues.js
 *
 * Parses ROADMAP.md backlog for Story blocks → creates GitHub Issues.
 * Writes <!-- #N --> markers back into ROADMAP.md so PRs can "closes #N".
 *
 * Usage (PowerShell):
 *   $env:GITHUB_TOKEN = $TOKEN   ← already set if your session is open
 *   node scripts/sync-stories-to-issues.js --dry-run   ← preview only
 *   node scripts/sync-stories-to-issues.js              ← create issues
 *
 * Safe to re-run: skips stories already tagged with <!-- #N -->.
 * Skips stories with Status: Resolved.
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER  = 'kaushikkuberanathan';
const REPO_NAME   = 'lineup_generator';
const ROADMAP_PATH = path.join(__dirname, '..', 'docs', 'product', 'ROADMAP.md');
const TOKEN   = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!TOKEN) {
  console.error('\n❌ GITHUB_TOKEN not set.');
  console.error('   Run: $env:GITHUB_TOKEN = $TOKEN\n');
  process.exit(1);
}

// ── Label inference ───────────────────────────────────────────────────────────

const AREA_RULES = [
  { keywords: ['share link', 'share-link', 'routing', 'unauthenticated', 'viewer', '?s=', 'renderSharedView'], label: 'area:share-link' },
  { keywords: ['scoring', 'pitch', 'inning', 'game mode', 'game-mode', 'dugoutview', 'scoringmode', 'at-bat', 'resolveAtBat', 'recordPitch'], label: 'area:scoring' },
  { keywords: ['rls', 'auth', 'magic link', 'session', 'otp', 'login', 'membership', 'access_request'], label: 'area:auth' },
  { keywords: ['supabase', 'migration', 'schema', 'database', 'postgres', 'jsonb', 'live_game_state'], label: 'area:supabase' },
  { keywords: ['roster', 'batting order', 'lineup engine', 'player.id', 'playerMapper'], label: 'area:roster' },
  { keywords: ['backend', 'express', 'render', 'api route', 'endpoint', 'middleware'], label: 'area:backend' },
  { keywords: ['ci', 'github actions', 'vitest', 'test suite', 'husky', 'workflow', 'suite-'], label: 'area:ci-ops' },
  { keywords: ['frontend', 'component', 'design token', 'ux', 'ui', 'css', 'tailwind'], label: 'area:ux' },
  { keywords: ['analytics', 'mixpanel', 'tracking'], label: 'area:analytics' },
];

const TYPE_RULES = [
  { keywords: ['bug', 'broken', 'regression', 'error', 'fail', 'not working', 'wrong', 'incorrect', 'stale', 'clobber', 'blocking'], label: 'type:bug' },
  { keywords: ['extract', 'refactor', 'cleanup', 'clean up', 'orphan', 'chore', 'debt', 'consolidate', 'helper'], label: 'type:chore' },
  { keywords: ['doc', 'test coverage', 'governance', 'audit', 'linter', 'migration file'], label: 'type:governance' },
  { keywords: ['feature', 'add', 'new capability', 'implement', 'support', 'parity'], label: 'type:feature' },
];

function inferLabels(priority, title, body) {
  const text = (title + ' ' + body).toLowerCase();
  const labels = [`priority:p${priority}`];

  for (const rule of AREA_RULES) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      labels.push(rule.label);
      break;
    }
  }

  for (const rule of TYPE_RULES) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      labels.push(rule.label);
      break;
    }
  }

  return labels;
}

// ── ROADMAP parser ────────────────────────────────────────────────────────────

function parseStories(content) {
  const stories = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match: ### Story N (P0) — title  OR  ### Story N (P1): title
    const headingMatch = line.match(
      /^###\s+Story\s+(\d+)\s+\(P([0-3])[^)]*\)[:\s—–-]+(.+?)(?:\s*<!--\s*#(\d+)\s*-->)?\s*$/
    );

    if (!headingMatch) { i++; continue; }

    const [, num, priority, rawTitle, existingIssue] = headingMatch;
    const title = rawTitle.trim();

    if (existingIssue) {
      console.log(`  ⏭  Story ${num}: already linked → #${existingIssue}`);
      i++; continue;
    }

    // Collect body until next ### heading
    const bodyLines = [];
    i++;
    while (i < lines.length && !lines[i].match(/^###\s/)) {
      bodyLines.push(lines[i]);
      i++;
    }
    const body = bodyLines.join('\n').trim();

    // Parse status
    const statusMatch = body.match(/\*?\*?Status:\*?\*?\s*(.+)/i);
    const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'open';

    if (status.includes('resolved')) {
      console.log(`  ⏭  Story ${num}: resolved — skipping`);
      continue;
    }

    let statusLabel = null;
    if (status.includes('deferred'))                                  statusLabel = 'status:deferred';
    else if (status.includes('in progress') || status.includes('in-progress')) statusLabel = 'status:in-progress';

    stories.push({ num: parseInt(num), priority, title, status, statusLabel, body, originalLine: line });
  }

  return stories.sort((a, b) => a.num - b.num);
}

// ── GitHub API ────────────────────────────────────────────────────────────────

function githubRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization:            `Bearer ${TOKEN}`,
        Accept:                   'application/vnd.github+json',
        'X-GitHub-Api-Version':   '2022-11-28',
        'User-Agent':             'dugout-lineup-sync',
        'Content-Type':           'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Reading ROADMAP.md...');
  const content = fs.readFileSync(ROADMAP_PATH, 'utf8');
  const stories = parseStories(content);

  if (stories.length === 0) {
    console.log('\n✅ No open stories without issue numbers found.\n');
    return;
  }

  console.log(`\n📋 ${stories.length} stories to process:\n`);
  for (const s of stories) {
    const labels = inferLabels(s.priority, s.title, s.body);
    if (s.statusLabel) labels.push(s.statusLabel);
    console.log(`  Story ${s.num} (P${s.priority}) — ${s.title}`);
    console.log(`    Labels : ${labels.join(', ')}`);
    console.log(`    Status : ${s.status}\n`);
  }

  if (DRY_RUN) {
    console.log('🏃 DRY RUN complete — no issues created.');
    console.log('   Re-run without --dry-run to create them.\n');
    return;
  }

  console.log('🚀 Creating GitHub Issues...\n');
  let updatedContent = content;

  for (const story of stories) {
    const labels = inferLabels(story.priority, story.title, story.body);
    if (story.statusLabel) labels.push(story.statusLabel);

    process.stdout.write(`  Story ${story.num} — ${story.title}... `);
    try {
      const res = await githubRequest(
        'POST',
        `/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
        {
          title: `Story ${story.num}: ${story.title}`,
          body:  `> Auto-created from ROADMAP.md Story ${story.num}. Update this issue as the story progresses.\n\n---\n\n${story.body}`,
          labels,
        }
      );

      if (res.status !== 201) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body)}`);

      const issueNum = res.body.number;
      console.log(`✅ #${issueNum}`);

      // Patch the heading line in ROADMAP.md
      updatedContent = updatedContent.replace(
        story.originalLine,
        `${story.originalLine} <!-- #${issueNum} -->`
      );

      await sleep(600);
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  fs.writeFileSync(ROADMAP_PATH, updatedContent, 'utf8');
  console.log('\n✅ ROADMAP.md patched with issue numbers.');
  console.log('📝 Next step: commit the ROADMAP.md changes.\n');
  console.log(`🔗 View issues: https://github.com/${REPO_OWNER}/${REPO_NAME}/issues\n`);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
