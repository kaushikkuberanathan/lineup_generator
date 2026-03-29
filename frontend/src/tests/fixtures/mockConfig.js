/**
 * mockConfig.js — Shared configuration fixture for V2 engine tests.
 *
 * NOTE: generateLineupV2(roster, innings) accepts only two arguments.
 * The engine computes benchSpotsPerInning internally as:
 *   Math.max(roster.length - 10, 0)
 *
 * mockConfig.benchSpotsPerInning documents the EXPECTED value for a given
 * roster size — tests must compute it from roster.length, not pass it to the engine.
 *
 * For mockRoster  (10 players): benchSpotsPerInning = 0
 * For mockRoster7  (7 players): benchSpotsPerInning = 0  (under-filled, see test 2.3)
 * For mockRoster12 (12 players): benchSpotsPerInning = 2
 */
export const mockConfig = {
  innings: 4,
  benchSpotsPerInning: 0,  // computed for 10-player mockRoster
};

export const mockConfig12 = {
  innings: 4,
  benchSpotsPerInning: 2,  // computed for 12-player mockRoster12
};
