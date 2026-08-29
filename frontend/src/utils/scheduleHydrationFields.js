/**
 * Local-only schedule fields that must survive database hydration.
 *
 * This is a production-owned contract shared by every hydration path and its
 * regression tests. Keep it immutable so consumers cannot silently alter the
 * merge policy at runtime.
 */
export const MERGE_FIELDS = Object.freeze([
  'scoreReported',
  'snackDuty',
  'snackNote',
  'gameBall',
  'usScore',
  'oppScore',
  'gameStatus',
  'finalizedAt',
]);
