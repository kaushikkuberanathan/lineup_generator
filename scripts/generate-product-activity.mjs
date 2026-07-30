#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPOSITORY = 'kaushikkuberanathan/lineup_generator';
const DEFAULT_MONTHS = 6;

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

function labelNames(pr) {
  return (pr.labels || []).map((label) => normalize(typeof label === 'string' ? label : label.name));
}

function hasAnyText(haystack, needles) {
  const text = normalize(haystack);
  return needles.some((needle) => text.includes(needle));
}

function hasAnyLabel(labels, needles) {
  return labels.some((label) => needles.some((needle) => label === needle || label.includes(needle)));
}

export function isProductionRelease(pr) {
  const labels = labelNames(pr);
  const titleAndBody = `${pr.title || ''} ${pr.body || ''}`;
  const base = normalize(pr.base?.ref);
  const head = normalize(pr.head?.ref);
  const releaseSignal =
    hasAnyLabel(labels, ['release', 'release: production', 'production']) ||
    hasAnyText(titleAndBody, ['production promotion', 'promotes', 'develop → main', 'develop -> main', 'release']);
  return base === 'main' && (head === 'develop' || releaseSignal) && releaseSignal;
}

export function isReleaseManagement(pr) {
  return /^(chore\(release\)|release)(\b|:)/.test(normalize(pr.title));
}

export function isActivityTooling(pr) {
  const title = normalize(pr.title);
  const head = normalize(pr.head?.ref);
  return (
    title.includes('product activity') ||
    title.includes('activity-data') ||
    head.includes('product-activity') ||
    head.includes('activity-data')
  );
}

export function isProductImprovement(pr) {
  if (isProductionRelease(pr) || isReleaseManagement(pr) || isActivityTooling(pr)) return false;
  const labels = labelNames(pr);
  const title = normalize(pr.title);
  const body = normalize(pr.body);
  return (
    hasAnyLabel(labels, ['type: story', 'type: feature', 'feature', 'enhancement', 'user-facing', 'product improvement']) ||
    /^(feat|feature)(\(.+\))?:/.test(title) ||
    hasAnyText(body, ['user-facing change', 'customer-facing change', "what's shipping"])
  );
}

export function isQualityImprovement(pr) {
  if (isProductionRelease(pr) || isReleaseManagement(pr) || isProductImprovement(pr)) return false;
  if (isActivityTooling(pr)) return true;
  const labels = labelNames(pr);
  const title = normalize(pr.title);
  return (
    hasAnyLabel(labels, [
      'type: bug', 'type: tech debt', 'type: tech-debt', 'bug', 'fix', 'test', 'quality',
      'security', 'reliability', 'performance', 'accessibility', 'documentation', 'tech debt',
      'tech-debt', 'refactor',
    ]) ||
    /^(fix|test|refactor|perf|security|docs|chore)(\(.+\))?:/.test(title)
  );
}

export function monthKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${dateValue}`);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function rollingMonths(count = DEFAULT_MONTHS, now = new Date()) {
  const months = [];
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1));
    months.push({
      key: monthKey(date),
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      start: date.toISOString(),
      end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString(),
    });
  }
  return months;
}

export function classifyPullRequest(pr) {
  if (isProductionRelease(pr)) return 'productionRelease';
  if (isProductImprovement(pr)) return 'productImprovement';
  if (isQualityImprovement(pr)) return 'qualityImprovement';
  return 'other';
}

export function aggregateActivity({ pullRequests, commits, months }) {
  const byMonth = new Map(months.map((month) => [month.key, {
    key: month.key, label: month.label, mergedPullRequests: 0, productImprovements: 0,
    productionReleases: 0, qualityImprovements: 0, developmentCommits: 0,
    otherPullRequests: 0, highlights: [],
  }]));

  const sortedPullRequests = [...pullRequests].sort((left, right) => {
    const leftTime = left.merged_at ? new Date(left.merged_at).getTime() : 0;
    const rightTime = right.merged_at ? new Date(right.merged_at).getTime() : 0;
    return rightTime - leftTime;
  });

  for (const pr of sortedPullRequests) {
    if (!pr.merged_at) continue;
    const bucket = byMonth.get(monthKey(pr.merged_at));
    if (!bucket) continue;
    bucket.mergedPullRequests += 1;
    const classification = classifyPullRequest(pr);
    if (classification === 'productionRelease') bucket.productionReleases += 1;
    else if (classification === 'productImprovement') bucket.productImprovements += 1;
    else if (classification === 'qualityImprovement') bucket.qualityImprovements += 1;
    else bucket.otherPullRequests += 1;
    if (classification === 'productImprovement' && bucket.highlights.length < 3) {
      bucket.highlights.push({ number: pr.number, title: pr.title, url: pr.html_url });
    }
  }

  for (const commit of commits) {
    const authoredAt = commit.commit?.author?.date || commit.commit?.committer?.date;
    if (!authoredAt) continue;
    const bucket = byMonth.get(monthKey(authoredAt));
    if (!bucket) continue;
    const isMerge = Array.isArray(commit.parents) && commit.parents.length > 1;
    const authorLogin = normalize(commit.author?.login || commit.committer?.login);
    const message = normalize(commit.commit?.message);
    const isGeneratedActivityCommit = message.startsWith('chore(activity):');
    const isBot = authorLogin.endsWith('[bot]') || authorLogin === 'github-actions';
    if (!isMerge && !isGeneratedActivityCommit && !isBot) bucket.developmentCommits += 1;
  }

  const monthRows = months.map((month) => byMonth.get(month.key));
  const totals = monthRows.reduce((sum, row) => ({
    mergedPullRequests: sum.mergedPullRequests + row.mergedPullRequests,
    productImprovements: sum.productImprovements + row.productImprovements,
    productionReleases: sum.productionReleases + row.productionReleases,
    qualityImprovements: sum.qualityImprovements + row.qualityImprovements,
    developmentCommits: sum.developmentCommits + row.developmentCommits,
  }), { mergedPullRequests: 0, productImprovements: 0, productionReleases: 0, qualityImprovements: 0, developmentCommits: 0 });
  return { months: monthRows, totals, currentMonth: monthRows.at(-1) };
}

async function githubRequest(url, token) {
  const response = await fetch(url, { headers: {
    Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'product-activity-generator',
  }});
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

export async function fetchMergedPullRequests({ repository, token, startDate }) {
  const results = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `https://api.github.com/repos/${repository}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`;
    const batch = await githubRequest(url, token);
    if (!batch.length) break;
    for (const pr of batch) if (pr.merged_at && new Date(pr.merged_at) >= startDate) results.push(pr);
    if (batch.length < 100) break;
  }
  return results;
}

async function fetchCommits({ repository, token, branch, startDate, endDate }) {
  const results = [];
  for (let page = 1; page <= 30; page += 1) {
    const params = new URLSearchParams({ sha: branch, since: startDate.toISOString(), until: endDate.toISOString(), per_page: '100', page: String(page) });
    const batch = await githubRequest(`https://api.github.com/repos/${repository}/commits?${params.toString()}`, token);
    results.push(...batch);
    if (batch.length < 100) break;
  }
  return results;
}

function parseArgs(argv) {
  const args = { output: 'product-activity.json', months: DEFAULT_MONTHS };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--output') args.output = argv[++i];
    else if (argv[i] === '--months') args.months = Number(argv[++i]);
    else if (argv[i] === '--repository') args.repository = argv[++i];
    else if (argv[i] === '--branch') args.branch = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

export async function runGenerator(options = {}) {
  const token = options.token || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required.');
  const repository = options.repository || process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
  const branch = options.branch || process.env.ACTIVITY_SOURCE_BRANCH || 'develop';
  const months = rollingMonths(options.months || DEFAULT_MONTHS, options.now || new Date());
  const startDate = new Date(months[0].start);
  const endDate = options.now || new Date();
  const [pullRequests, commits] = await Promise.all([
    fetchMergedPullRequests({ repository, token, startDate }),
    fetchCommits({ repository, token, branch, startDate, endDate }),
  ]);
  const activity = aggregateActivity({ pullRequests, commits, months });
  return {
    schemaVersion: 1, generatedAt: new Date().toISOString(), repository, sourceBranch: branch,
    windowMonths: months.length,
    definitions: {
      mergedPullRequests: 'Pull requests merged during the calendar month.',
      productImprovements: 'Merged customer-facing PRs, excluding release management and internal activity tooling.',
      productionReleases: 'Release or promotion PRs merged into main.',
      qualityImprovements: 'Merged PRs focused on fixes, testing, security, reliability, accessibility, documentation, refactoring, technical debt, or internal activity tooling.',
      developmentCommits: 'Non-merge, non-bot commits on the source branch. Generated activity commits are excluded.',
    },
    ...activity,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const result = await runGenerator(args);
  const outputPath = path.resolve(args.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(result.currentMonth, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
