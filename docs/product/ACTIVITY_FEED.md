# Public Product Activity Feed

The public portfolio reads a generated six-month activity summary from `product-activity.json` on the `activity-data` branch.

## Commit-centric metrics

The public dashboard treats each eligible commit as a unit of delivery effort. It counts non-merge, non-bot commits on `develop` and excludes the generated activity refresh commit itself.

Eligible commits are classified from their conventional-commit prefix:

- **Product commits** — `feat` and `feature`
- **Quality commits** — `fix`, `test`, `refactor`, `perf`, `security`, and `revert`
- **Delivery commits** — `docs`, `chore`, `ci`, `build`, `style`, release, and promotion commits
- **Other commits** — eligible commits without a recognized prefix

Every eligible commit must land in exactly one category. The workflow validates that the category total equals the monthly commit total before publishing.

Legacy PR-based fields remain in the JSON temporarily so older portfolio clients do not break during the transition. They are no longer the primary public activity model.

## Production release notes

The feed still uses release promotion pull requests for `latestReleaseNotes`, because those PR bodies provide the clearest production-level summary of what shipped. Each public title combines the release version with the first bullet under the release PR's `Shipping` or `What's shipping` section.

Individual story or feature PRs are not used as public release-note links. Release PRs explicitly marked `Internal-only release` or `No user-facing change` are excluded from the public list.

## Refresh and hosting behavior

`.github/workflows/update-product-activity.yml` validates the generator, creates the rolling JSON payload, and updates only the generated `activity-data` branch. The workflow runs weekly, can be triggered manually, and refreshes when the activity tooling changes on `develop`.

The generated branch includes `frontend/vercel.json` with Vercel Git deployments disabled for `activity-data`. This keeps the branch available as a raw GitHub data source without creating failed Vercel previews caused by the application project's `frontend` root-directory requirement.
