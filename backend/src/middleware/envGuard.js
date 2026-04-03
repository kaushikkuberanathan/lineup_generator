/**
 * envGuard.js
 * Guards against test team data being accessed in production.
 *
 * Configure via environment variable:
 *   TEST_TEAM_IDS=test-td-suite,test-contracts-suite,another-test-id
 *
 * Behaviour:
 *   - NODE_ENV === 'production' + teamId in TEST_TEAM_IDS  → throws 403
 *   - NODE_ENV !== 'production' + teamId NOT in TEST_TEAM_IDS → console.warn
 *     (alerts devs that they are touching a real team in a non-prod environment)
 */

// Parse once at module load — not per-request
const TEST_TEAM_IDS = new Set(
  (process.env.TEST_TEAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
);

/**
 * Throws a 403 error if a test teamId is used in production.
 * Logs a warning in non-production environments when a real teamId is used.
 *
 * @param {string} teamId
 * @throws {Error} err.status=403, err.code='FORBIDDEN_TEST_DATA'
 */
function rejectTestDataInProd(teamId) {
  const isTestTeam = TEST_TEAM_IDS.has(String(teamId));

  if (process.env.NODE_ENV === 'production' && isTestTeam) {
    const err = new Error('Test team data is not accessible in production');
    err.status = 403;
    err.code = 'FORBIDDEN_TEST_DATA';
    throw err;
  }

  if (process.env.NODE_ENV !== 'production' && !isTestTeam && teamId) {
    console.warn(
      `[envGuard] Non-test teamId "${teamId}" used in ${process.env.NODE_ENV || 'development'} environment — ` +
      'add to TEST_TEAM_IDS if this is a test team'
    );
  }
}

module.exports = { rejectTestDataInProd };
