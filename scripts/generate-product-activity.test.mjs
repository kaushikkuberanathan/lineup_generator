import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateActivity,
  classifyPullRequest,
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
  const release = pr({
    title: 'Release 2.8.0 — develop → main promotion',
    base: { ref: 'main' },
    head: { ref: 'develop' },
  });
  assert.equal(isProductionRelease(release), true);
  assert.equal(classifyPullRequest(release), 'productionRelease');
});

test('feature and quality classifications are mutually exclusive', () => {
  assert.equal(classifyPullRequest(pr()), 'productImprovement');
  assert.equal(classifyPullRequest(pr({ title: 'test(data): cover write guard' })), 'qualityImprovement');
  assert.equal(classifyPullRequest(pr({ title: 'Update dependency metadata' })), 'other');
});

test('aggregation excludes merge, bot, and generated activity commits', () => {
  const months = rollingMonths(2, new Date('2026-07-29T12:00:00Z'));
  const result = aggregateActivity({
    months,
    pullRequests: [
      pr({ number: 1 }),
      pr({ number: 2, title: 'fix(storage): preserve pending sync' }),
      pr({
        number: 3,
        title: 'Release 2.8.0 — develop → main promotion',
        base: { ref: 'main' },
        head: { ref: 'develop' },
      }),
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
