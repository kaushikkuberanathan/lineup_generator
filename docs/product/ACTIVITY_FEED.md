# Public Product Activity Feed

The public portfolio reads a generated six-month activity summary from `product-activity.json` on the `activity-data` branch.

## Reported metrics

- Merged pull requests
- Customer-facing product improvements
- Production releases promoted into `main`
- Quality, reliability, security, testing, documentation, and technical-debt improvements
- Non-merge development commits on `develop`

## Release notes

The feed publishes `latestReleaseNotes`, containing the three most recent production-promotion pull requests in the reporting window. Story and feature pull requests remain part of the monthly product-improvement count, but they are not used as public release-note links.

For backward compatibility, each month's `highlights` field mirrors that month's production release notes while portfolio clients transition to `latestReleaseNotes`.

## Refresh behavior

`.github/workflows/update-product-activity.yml` validates the generator, creates the rolling JSON payload, and updates only the generated `activity-data` branch. The workflow runs weekly, can be triggered manually, and refreshes when the activity tooling changes on `develop`.
