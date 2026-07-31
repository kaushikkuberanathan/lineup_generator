# Public Product Activity Feed

The public portfolio reads a generated six-month activity summary from `product-activity.json` on the `activity-data` branch.

## Reported metrics

The dashboard is commit-driven. Every eligible individual commit on `develop` is counted once as delivery effort:

- **Committed improvements** — all non-merge, non-bot commits, excluding the generated activity refresh commit.
- **Product improvements** — individual feature commits representing customer-facing or experience work.
- **Quality improvements** — fixes, tests, security, reliability, accessibility, documentation, refactoring, build work, and other engineering improvements.
- **Production releases** — user-facing promotion pull requests merged into `main`.

`productImprovements + qualityImprovements` must reconcile to `developmentCommits` for every month. The legacy `mergedPullRequests` field remains in the JSON only for backward compatibility and is no longer the public delivery measure.

## Release notes

The feed publishes `latestReleaseNotes`, containing the three most recent user-facing production releases in the reporting window. Each public title combines the release version with the first bullet under the release PR's `Shipping` or `What's shipping` section.

Story and feature PRs are not used as release-note links. Release PRs explicitly marked `Internal-only release` or `No user-facing change` are excluded from the public list.

For backward compatibility, each month's `highlights` field mirrors that month's summarized production release notes while portfolio clients transition to `latestReleaseNotes`.

## Refresh behavior

`.github/workflows/update-product-activity.yml` validates the generator, creates the rolling JSON payload, and updates only the generated `activity-data` branch. The workflow runs weekly, can be triggered manually, and refreshes when the activity tooling changes on `develop`.

The generated branch also includes `frontend/vercel.json` with Git deployments disabled. This prevents Vercel from attempting to build the data-only branch, whose previous previews failed because the configured `frontend` Root Directory did not exist.
