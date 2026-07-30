import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateActivity,
  classifyPullRequest,
  fetchMergedPullRequests,
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

function commit(overrides = {}) {
  return {
    commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'feat: work' },
    author: { login: 'kaushikkuberanathan' },
    parents: [{ sha: 'one' }],
    ...overrides,
  };
}

test('production release requires a main promotion signal', () => {
  const release = pr({ title: 'Release 2.8.0 — develop → main promotion', base: { ref: 'main' }, head: { ref: 'develop' } });
  assert.equal(isProductionRelease(release), true);
  assert.equal(classifyPullRequest(release), 'productionRelease');
});

test('feature and quality classifications are mutually exclusive', () => {
  assert.equal(classifyPullRequest(pr()), 'productImprovement');
  assert.equal(classifyPullRequest(pr({ title: 'test(data): cover write guard' })), 'qualityImprovement');
  assert.equal(classifyPullRequest(pr({ title: 'Update dependency metadata' })), 'other');
});

test('release-management PRs are not product or quality improvements', () => {
  assert.equal(classifyPullRequest(pr({ title: 'chore(release): 2.8.1 — internal-only', body: "## What's shipping\n- extraction and coverage work" })), 'other');
  assert.equal(classifyPullRequest(pr({ title: 'Release v2.5.3: version history and branch enforcement', body: "## What's shipping\n- release administration" })), 'other');
});

test('internal activity tooling is quality work even when feature-labeled', () => {
  assert.equal(
    classifyPullRequest(pr({
      title: 'Exclude release management from product activity metrics',
      labels: [{ name: 'type: feature' }],
      head: { ref: 'fix/product-activity-release-classification' },
    })),
    'qualityImprovement',
  );
});

test('aggregation excludes merge, bot, and generated activity commits', () => {
  const months = rollingMonths(2, new Date('2026-07-29T12:00:00Z'));
  const result = aggregateActivity({
    months,
    pullRequests: [
      pr({ number: 1 }),
      pr({ number: 2, title: 'fix(storage): preserve pending sync' }),
      pr({ number: 3, title: 'Release 2.8.0 — develop → main promotion', base: { ref: 'main' }, head: { ref: 'develop' } }),
    ],
    commits: [
      commit(),
      commit({ parents: [{ sha: 'one' }, { sha: 'two' }] }),
      commit({ author: { login: 'github-actions[bot]' } }),
      commit({ commit: { author: { date: '2026-07-12T12:00:00Z' }, message: 'chore(activity): refresh' } }),
    ],
  });
  assert.equal(result.currentMonth.mergedPullRequests, 3);
  assert.equal(result.currentMonth.productImprovements, 1);
  assert.equal(result.currentMonth.qualityImprovements, 1);
  assert.equal(result.currentMonth.productionReleases, 1);
  assert.equal(result.currentMonth.developmentCommits, 1);
  assert.equal(result.currentMonth.highlights.length, 1);
});

test('highlights are ordered by merge date even when API results are not', () => {
  const months = rollingMonths(1, new Date('2026-07-29T12:00:00Z'));
  const result = aggregateActivity({
    months,
    pullRequests: [
      pr({ number: 10, title: 'feat: older improvement', merged_at: '2026-07-02T12:00:00Z' }),
      pr({ number: 11, title: 'feat: newest improvement', merged_at: '2026-07-27T12:00:00Z' }),
      pr({ number: 12, title: 'feat: middle improvement', merged_at: '2026-07-14T12:00:00Z' }),
    ],
    commits: [],
  });
  assert.deepEqual(result.currentMonth.highlights.map((highlight) => highlight.number), [11, 12, 10]);
});

test('pull-request pagination does not stop on an out-of-order updated_at value', async () => {
  const originalFetch = globalThis.fetch;
  const pageOne = Array.from({ length: 100 }, (_, index) => pr({
    number: index + 1,
    merged_at: '2026-07-10T12:00:00Z',
    updated_at: index === 0 ? '2025-12-01T12:00:00Z' : '2026-07-10T12:00:00Z',
  }));
  const pageTwo = [pr({ number: 101, merged_at: '2026-07-20T12:00:00Z' })];
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    const page = Number(new URL(url).searchParams.get('page'));
    return { ok: true, json: async () => (page === 1 ? pageOne : pageTwo), text: async () => '' };
  };
  try {
    const results = await fetchMergedPullRequests({ repository: 'example/repository', token: 'test-token', startDate: new Date('2026-02-01T00:00:00Z') });
    assert.equal(calls, 2);
    assert.equal(results.length, 101);
    assert.equal(results.at(-1).number, 101);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
