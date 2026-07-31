import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateActivity,
  classifyCommit,
  classifyPullRequest,
  fetchMergedPullRequests,
  isEligibleCommit,
  isProductionRelease,
  rollingMonths,
} from './generate-product-activity.mjs';

function pr(overrides = {}) {
  return {
    number: 1,
    title: 'feat(coach): add lineup sharing',
    body: '',
    labels: [],
    merged_at: '2026-07-15T12:00:00Z',
    updated_at: '2026-07-15T12:00:00Z',
    html_url: 'https://example.com/pr/1',
    base: { ref: 'develop' },
    head: { ref: 'issue/1' },
    ...overrides,
  };
}

function releasePr(overrides = {}) {
  return pr({
    title: 'Release 2.8.0 — develop → main promotion',
    body: "## What's shipping\n\n- **Set your name (#405 / #408)** - coaches can set a display name.",
    base: { ref: 'main' },
    head: { ref: 'develop' },
    ...overrides,
  });
}

function commit(overrides = {}) {
  return {
    sha: 'abc123',
    html_url: 'https://example.com/commit/abc123',
    commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'feat: work' },
    author: { login: 'kaushikkuberanathan' },
    parents: [{ sha: 'one' }],
    ...overrides,
  };
}

test('production release requires a main promotion signal', () => {
  const release = releasePr();
  assert.equal(isProductionRelease(release), true);
  assert.equal(classifyPullRequest(release), 'productionRelease');
});

test('commit classification follows conventional commit intent', () => {
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'feat(auth): add Google sign-in' } })), 'product');
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: '\uFEFFfix(data): block roster wipe' } })), 'quality');
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'test(rls): pin policy behavior' } })), 'quality');
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'docs(activity): explain metrics' } })), 'delivery');
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'promote: release 2.8.0 to production' } })), 'delivery');
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'Release 2.8.0 to production' } })), 'delivery');
  assert.equal(classifyCommit(commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'Tighten lineup behavior' } })), 'other');
});

test('merge, bot, and generated activity commits are excluded', () => {
  const merge = commit({ parents: [{ sha: 'one' }, { sha: 'two' }] });
  const bot = commit({ author: { login: 'github-actions[bot]' } });
  const generated = commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'chore(activity): refresh public product metrics [skip ci]' } });

  for (const item of [merge, bot, generated]) {
    assert.equal(isEligibleCommit(item), false);
    assert.equal(classifyCommit(item), 'excluded');
  }
});

test('legacy PR classifications remain available during portfolio migration', () => {
  assert.equal(classifyPullRequest(pr()), 'productImprovement');
  assert.equal(classifyPullRequest(pr({ title: 'test(data): cover write guard' })), 'qualityImprovement');
  assert.equal(classifyPullRequest(pr({ title: 'Update dependency metadata' })), 'other');
});

test('aggregation counts every eligible commit exactly once', () => {
  const months = rollingMonths(2, new Date('2026-07-29T12:00:00Z'));
  const result = aggregateActivity({
    months,
    pullRequests: [
      pr({ number: 1 }),
      pr({ number: 2, title: 'fix(storage): preserve pending sync' }),
      releasePr({ number: 3 }),
    ],
    commits: [
      commit({ sha: 'product', commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'feat(account): add name field' } }),
      commit({ sha: 'quality', commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'fix(data): preserve roster' } }),
      commit({ sha: 'delivery', commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'docs(release): record rollout' } }),
      commit({ sha: 'other', commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'Tighten lineup behavior' } }),
      commit({ sha: 'merge', parents: [{ sha: 'one' }, { sha: 'two' }] }),
      commit({ sha: 'bot', author: { login: 'github-actions[bot]' } }),
      commit({ sha: 'generated', commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'chore(activity): refresh public product metrics [skip ci]' } }),
    ],
  });

  assert.equal(result.currentMonth.developmentCommits, 4);
  assert.equal(result.currentMonth.productCommits, 1);
  assert.equal(result.currentMonth.qualityCommits, 1);
  assert.equal(result.currentMonth.deliveryCommits, 1);
  assert.equal(result.currentMonth.otherCommits, 1);
  assert.equal(
    result.currentMonth.productCommits + result.currentMonth.qualityCommits + result.currentMonth.deliveryCommits + result.currentMonth.otherCommits,
    result.currentMonth.developmentCommits,
  );

  assert.equal(result.currentMonth.mergedPullRequests, 3);
  assert.equal(result.currentMonth.productionReleases, 1);
  assert.equal(result.latestReleaseNotes[0].title, 'Release 2.8.0 — Set your name');
});

test('latest release notes are ordered by merge date and exclude story PRs and internal releases', () => {
  const months = rollingMonths(1, new Date('2026-07-29T12:00:00Z'));
  const result = aggregateActivity({
    months,
    pullRequests: [
      releasePr({ number: 10, title: 'Release 2.7.0', body: "## Shipping\n\n- **Older capability (#10)** - details", merged_at: '2026-07-02T12:00:00Z' }),
      pr({ number: 99, title: 'feat: newest story', merged_at: '2026-07-28T12:00:00Z' }),
      releasePr({ number: 13, title: 'Release 2.10.0', body: 'Internal-only release. No user-facing change.\n\n## Shipping\n\n- **Internal refactor** - details', merged_at: '2026-07-28T12:00:00Z' }),
      releasePr({ number: 11, title: 'Release 2.9.0', body: "## What's shipping\n\n- **Newest capability (#11 / #12)** - details", merged_at: '2026-07-27T12:00:00Z' }),
      releasePr({ number: 12, title: 'Release 2.8.0', body: "## Shipping\n\n- **Middle capability** - details", merged_at: '2026-07-14T12:00:00Z' }),
    ],
    commits: [],
  });

  assert.deepEqual(result.latestReleaseNotes.map((note) => note.number), [11, 12, 10]);
  assert.deepEqual(result.latestReleaseNotes.map((note) => note.title), [
    'Release 2.9.0 — Newest capability',
    'Release 2.8.0 — Middle capability',
    'Release 2.7.0 — Older capability',
  ]);
});

test('pull-request pagination does not stop on an out-of-order updated_at value', async () => {
  const originalFetch = globalThis.fetch;
  const pageOne = Array.from({ length: 100 }, (_, index) =>
    pr({
      number: index + 1,
      merged_at: '2026-07-10T12:00:00Z',
      updated_at: index === 0 ? '2025-12-01T12:00:00Z' : '2026-07-10T12:00:00Z',
    }),
  );
  const pageTwo = [pr({ number: 101, merged_at: '2026-07-20T12:00:00Z' })];
  let calls = 0;

  globalThis.fetch = async (url) => {
    calls += 1;
    const page = Number(new URL(url).searchParams.get('page'));
    return {
      ok: true,
      json: async () => (page === 1 ? pageOne : pageTwo),
      text: async () => '',
    };
  };

  try {
    const results = await fetchMergedPullRequests({
      repository: 'example/repository',
      token: 'test-token',
      startDate: new Date('2026-02-01T00:00:00Z'),
    });

    assert.equal(calls, 2);
    assert.equal(results.length, 101);
    assert.equal(results.at(-1).number, 101);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
