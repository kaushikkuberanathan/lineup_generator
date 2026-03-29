/**
 * mockRoster.js — Test fixtures for the V2 lineup engine.
 *
 * Players use the flat field names that playerMapper.js reads directly
 * (not nested under an `attributes` sub-object).
 *
 * Attribute mapping (spec "mid-range 5" → actual engine level):
 *   fieldingReliability  → reliability: "average"   (maps to 0.7)
 *   reactionTiming       → reaction:    "average"   (maps to 0.7)
 *   armStrength          → armStrength: "average"   (maps to 0.7)
 *   battingContact       → contact:     "medium"    (maps to 0.7)
 *   battingPower         → power:       "medium"    (maps to 0.7)
 *   battingDiscipline    → swingDiscipline: "disciplined" (maps to 1.0, nearest "medium")
 *   runningSpeed         → speed:       "average"   (maps to 0.7)
 */

function makePlayer(number, name) {
  const [firstName, ...rest] = name.split(' ');
  return {
    // Identity
    id: `player-${String(number).padStart(2, '0')}`,
    name,
    firstName,
    lastName: rest.join(' '),

    // Fielding (all mid-range)
    reliability:  'average',
    reaction:     'average',
    armStrength:  'average',
    ballType:     'both',       // handles both ground + fly equally
    knowsWhereToThrow: false,
    callsForBall:     false,
    backsUpPlays:     false,
    anticipatesPlays: false,

    // Batting (all mid-range)
    contact:          'medium',
    power:            'medium',
    swingDiscipline:  'disciplined',
    tracksBallWell:   false,
    patientAtPlate:   false,
    confidentHitter:  false,

    // Running (all mid-range)
    speed:              'average',
    runsThroughFirst:   false,
    listensToCoaches:   false,
    awareOnBases:       false,

    // V1 arrays (safe empty defaults)
    skills:    [],
    tags:      [],
    batSkills: [],

    // Constraints
    skipBench:          false,
    outThisGame:        false,
    preferredPositions: [],
    avoidPositions:     [],

    // Development
    developmentFocus: 'balanced',
  };
}

export const mockRoster = [
  makePlayer( 1, 'Player One'),
  makePlayer( 2, 'Player Two'),
  makePlayer( 3, 'Player Three'),
  makePlayer( 4, 'Player Four'),
  makePlayer( 5, 'Player Five'),
  makePlayer( 6, 'Player Six'),
  makePlayer( 7, 'Player Seven'),
  makePlayer( 8, 'Player Eight'),
  makePlayer( 9, 'Player Nine'),
  makePlayer(10, 'Player Ten'),
];

/** Under-strength roster — 7 players, fewer than the 10 field positions */
export const mockRoster7 = mockRoster.slice(0, 7);

/** Over-strength roster — 12 players, bench = 2 per inning */
export const mockRoster12 = [
  ...mockRoster,
  makePlayer(11, 'Player Eleven'),
  makePlayer(12, 'Player Twelve'),
];
