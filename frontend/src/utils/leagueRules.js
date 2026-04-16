/**
 * FCPRD Youth Baseball & Softball — Rule Engine
 * Source: 2026 Youth Baseball/Softball Rules & Regulations
 *
 * Age group tokens:
 *   Baseball:  '5U' | '6U' | '7U' | '8U' | '9-10U-minor' | '9-10U' | '11-12U' | '13-14U' | '15-18U'
 *   Softball:  '5-6U' | '7-8U' | '9-10U' | '11-13U' | '14-18U'
 */

export const SPORT = {
  BASEBALL: 'baseball',
  SOFTBALL: 'softball',
};

export const PITCH_TYPE = {
  BALL:            'ball',
  STRIKE_CALLED:   'strike_called',
  STRIKE_SWINGING: 'strike_swinging',
  FOUL:            'foul',
  CONTACT:         'contact',
  ATTEMPT_SWING:   'attempt_swing',
  ATTEMPT_TAKEN:   'attempt_taken',
  ATTEMPT_TEE:     'attempt_tee',
};

export const AT_BAT_RESULT = {
  IN_PROGRESS:     'in_progress',
  WALK:            'walk',
  STRIKEOUT:       'strikeout',
  OUT_ATTEMPTS:    'out_attempts',
  SINGLE:          'single',
  DOUBLE:          'double',
  TRIPLE:          'triple',
  HOME_RUN:        'home_run',
  OUT_AT_FIRST:    'out_at_first',
  FLYOUT:          'flyout',
  FORCE_OUT:       'force_out',
  ERROR_REACHED:   'error_reached',
  HBP:             'hbp',
  FIELDERS_CHOICE: 'fielders_choice',
};

export const STEAL_RULE = {
  NOT_ALLOWED: 'not_allowed',
  LIMITED:     'limited',
  FULL:        'full',
};

export const STEAL_TRIGGER = {
  PLATE_CROSSING: 'plate_crossing',
  PITCHER_HAND:   'pitcher_hand',
  NOT_ALLOWED:    'not_allowed',
};

export const PITCHING_MODE = {
  COACH_ONLY: 'coach_only',
  HYBRID:     'hybrid',
  KID_ONLY:   'kid_only',
};

const RULE_PROFILES = {

  'baseball:5U': {
    label: '5U Baseball', sport: SPORT.BASEBALL, ageGroup: '5U', appendix: 'A',
    basesDistanceFt: 50, pitchingDistFt: 42, homeArcFt: 20,
    innings: 5, timeCapMinutes: 55, runLimitPerInning: 5, runLimitFinalInning: null,
    mercyRuns: null, minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.COACH_ONLY, coachPitchUnderhand: false, teeAllowed: true,
    atBatModel: 'attempts', maxAttempts: 5, minCoachPitchAttempts: 2,
    foulOnLastAttemptIsOut: false, failureToSwingOnLastIsOut: true,
    maxBalls: null, maxStrikes: null, walksAllowed: false, strikeoutsAllowed: false,
    droppedThirdStrikeIsOut: false,
    stealRule: STEAL_RULE.NOT_ALLOWED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: false, onFieldCoachesDefense: 2,
    ballSpec: 'Worth RIF 10', pitchChartRequired: false,
  },

  'baseball:6U': {
    label: '6U Baseball', sport: SPORT.BASEBALL, ageGroup: '6U', appendix: 'B',
    basesDistanceFt: 60, pitchingDistFt: 42, homeArcFt: 20,
    innings: 6, timeCapMinutes: 55, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.COACH_ONLY, coachPitchUnderhand: false, teeAllowed: true,
    atBatModel: 'attempts', maxAttempts: 5, minCoachPitchAttempts: 2,
    foulOnLastAttemptIsOut: false, failureToSwingOnLastIsOut: true,
    maxBalls: null, maxStrikes: null, walksAllowed: false, strikeoutsAllowed: false,
    droppedThirdStrikeIsOut: false,
    stealRule: STEAL_RULE.NOT_ALLOWED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: false, onFieldCoachesDefense: 2,
    ballSpec: 'Worth RIF 10', pitchChartRequired: false,
  },

  'baseball:7U': {
    label: '7U Baseball', sport: SPORT.BASEBALL, ageGroup: '7U', appendix: 'D',
    basesDistanceFt: 60, pitchingDistFt: 42, homeArcFt: 20,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.COACH_ONLY, coachPitchUnderhand: false, teeAllowed: false,
    atBatModel: 'strikes_or_attempts', maxAttempts: 5, maxStrikes: 3,
    foulOnLastAttemptIsOut: false, failureToSwingOnLastIsOut: true,
    maxBalls: null, walksAllowed: false, strikeoutsAllowed: true,
    droppedThirdStrikeIsOut: false,
    stealRule: STEAL_RULE.NOT_ALLOWED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 10, catcherRequired: true, onFieldCoachesDefense: 1,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: false,
  },

  'baseball:8U': {
    label: '8U Baseball', sport: SPORT.BASEBALL, ageGroup: '8U', appendix: 'E',
    basesDistanceFt: 60, pitchingDistFt: 40,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 3, runLimitFinalInning: 6,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.HYBRID, coachPitchUnderhand: false, teeAllowed: false,
    atBatModel: 'hybrid', maxStrikes: 3, maxBalls: 4,
    coachPitchesOnBallFour: 2,
    foulOnThirdStrikeExtends: true, foulOnCoachSecondPitchExtends: true,
    walksAllowed: false, strikeoutsAllowed: true, droppedThirdStrikeIsOut: true,
    maxInningsPerGame: 2, maxInningsPerWeek: 4, restRequiredAfterMaxGameInnings: 1,
    stealRule: STEAL_RULE.NOT_ALLOWED, leadOffsAllowed: false, canStealHome: false,
    noAdvanceOnWildPitch: true, runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 10, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: true,
  },

  'baseball:9-10U-minor': {
    label: '9-10U Baseball (Minor/Fall)', sport: SPORT.BASEBALL,
    ageGroup: '9-10U-minor', appendix: 'F', seasonNote: 'Fall season only',
    basesDistanceFt: 65, pitchingDistFt: 46,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 3, runLimitFinalInning: 6,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.HYBRID, teeAllowed: false,
    atBatModel: 'hybrid', maxStrikes: 3, maxBalls: 4, coachPitchesOnBallFour: 2,
    foulOnThirdStrikeExtends: true, foulOnCoachSecondPitchExtends: true,
    walksAllowed: false, strikeoutsAllowed: true, droppedThirdStrikeIsOut: true,
    maxInningsPerGame: 3, maxInningsPerWeek: 6, restRequiredAfterMaxGameInnings: 1,
    stealRule: STEAL_RULE.LIMITED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noStealAfterWalkOrHBP: true, noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: true,
  },

  'baseball:9-10U': {
    label: '9-10U Baseball (Major/Spring)', sport: SPORT.BASEBALL,
    ageGroup: '9-10U', appendix: 'G', seasonNote: 'Spring season primary division',
    basesDistanceFt: 65, pitchingDistFt: 46,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 3, runLimitFinalInning: 6,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.KID_ONLY, teeAllowed: false,
    atBatModel: 'standard', maxBalls: 4, maxStrikes: 3,
    walksAllowed: true, strikeoutsAllowed: true, droppedThirdStrikeIsOut: true,
    maxInningsPerGame: 3, maxInningsPerWeek: 6, restRequiredAfterMaxGameInnings: 1,
    stealRule: STEAL_RULE.FULL, leadOffsAllowed: false, canStealHome: true,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: true,
  },

  'baseball:11-12U': {
    label: '11-12U Baseball', sport: SPORT.BASEBALL, ageGroup: '11-12U', appendix: 'H',
    basesDistanceFt: 70, pitchingDistFt: 50,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.KID_ONLY, teeAllowed: false,
    atBatModel: 'standard', maxBalls: 4, maxStrikes: 3,
    walksAllowed: true, strikeoutsAllowed: true, droppedThirdStrikeIsOut: false,
    maxInningsPerGame: 3, maxInningsPerWeek: 6, restRequiredAfterMaxGameInnings: 1,
    stealRule: STEAL_RULE.FULL, leadOffsAllowed: true, canStealHome: true,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: true,
  },

  'baseball:13-14U': {
    label: '13-14U Baseball', sport: SPORT.BASEBALL, ageGroup: '13-14U', appendix: 'I',
    basesDistanceFt: 80, pitchingDistFt: 54,
    innings: 7, timeCapMinutes: 100, runLimitPerInning: 7, runLimitFinalInning: 14,
    mercyRules: [
      { afterInning: 3, runDiff: 15 },
      { afterInning: 4, runDiff: 10 },
      { afterInning: 5, runDiff: 8 },
    ],
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.KID_ONLY, teeAllowed: false,
    atBatModel: 'standard', maxBalls: 4, maxStrikes: 3,
    walksAllowed: true, strikeoutsAllowed: true, droppedThirdStrikeIsOut: false,
    pitchingRules: 'USSSA', maxInningsPerGame: null, maxInningsPerWeek: null,
    restRequiredAfterMaxGameInnings: null,
    stealRule: STEAL_RULE.FULL, leadOffsAllowed: true, canStealHome: true,
    noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: true,
    noMetalCleatsOnArtificialMound: true,
  },

  'baseball:15-18U': {
    label: '15-18U Baseball', sport: SPORT.BASEBALL, ageGroup: '15-18U', appendix: 'J',
    basesDistanceFt: 90, pitchingDistFt: 60.5,
    innings: 7, timeCapMinutes: 115, runLimitPerInning: 7, runLimitFinalInning: 14,
    mercyRules: [
      { afterInning: 3, runDiff: 15 },
      { afterInning: 4, runDiff: 10 },
      { afterInning: 5, runDiff: 8 },
    ],
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.KID_ONLY, teeAllowed: false,
    atBatModel: 'standard', maxBalls: 4, maxStrikes: 3,
    walksAllowed: true, strikeoutsAllowed: true, droppedThirdStrikeIsOut: false,
    pitchingRules: 'USSSA', maxInningsPerGame: null, maxInningsPerWeek: null,
    stealRule: STEAL_RULE.FULL, leadOffsAllowed: true, canStealHome: true,
    noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: false, minPlayRequirement: false,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: 'Standard Regulation Baseball', pitchChartRequired: true,
    noMetalCleatsOnArtificialMound: true,
  },

  'softball:5-6U': {
    label: '5-6U Softball', sport: SPORT.SOFTBALL, ageGroup: '5-6U', appendix: 'K',
    basesDistanceFt: 50, pitchingDistFt: 35, homeArcFt: 10,
    innings: 6, timeCapMinutes: 55, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7, noOutsCharged: true,
    pitchingMode: PITCHING_MODE.COACH_ONLY, coachPitchUnderhand: true, teeAllowed: true,
    atBatModel: 'attempts', maxAttempts: 5, minCoachPitchAttempts: 2,
    foulOnLastAttemptIsOut: false, failureToSwingOnLastIsOut: true,
    maxBalls: null, maxStrikes: null, walksAllowed: false, strikeoutsAllowed: false,
    droppedThirdStrikeIsOut: false,
    stealRule: STEAL_RULE.NOT_ALLOWED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: false, onFieldCoachesDefense: 2,
    ballSpec: 'Easton 11" Incrediball', pitchChartRequired: false,
  },

  'softball:7-8U': {
    label: '7-8U Softball', sport: SPORT.SOFTBALL, ageGroup: '7-8U', appendix: 'L',
    basesDistanceFt: 60, pitchingDistFt: 35, coachPitchMinDistFt: 20,
    innings: 6, timeCapMinutes: 70, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.COACH_ONLY, coachPitchUnderhand: true, teeAllowed: false,
    atBatModel: 'strikes_or_attempts', maxAttempts: 5, maxStrikes: 3,
    foulOnLastAttemptIsOut: false, failureToSwingOnLastIsOut: true,
    maxBalls: null, walksAllowed: false, strikeoutsAllowed: true,
    droppedThirdStrikeIsOut: false,
    stealRule: STEAL_RULE.NOT_ALLOWED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 10, catcherRequired: true, onFieldCoachesDefense: 1,
    ballSpec: '11" Regulation Fast-Pitch Softball (Optic Yellow)',
    pitchChartRequired: false,
  },

  'softball:9-10U': {
    label: '9-10U Softball', sport: SPORT.SOFTBALL, ageGroup: '9-10U', appendix: 'M',
    basesDistanceFt: 60, pitchingDistFt: 35,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 3, runLimitFinalInning: 6,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.HYBRID, coachPitchUnderhand: true, teeAllowed: false,
    atBatModel: 'hybrid', maxStrikes: 3, maxBalls: 4, coachPitchesOnBallFour: 2,
    foulOnThirdStrikeExtends: true, foulOnCoachSecondPitchExtends: true,
    walksAllowed: false, strikeoutsAllowed: true, droppedThirdStrikeIsOut: true,
    stealRule: STEAL_RULE.LIMITED, leadOffsAllowed: false, canStealHome: false,
    runnersLeaveOnPitch: true, noStealAfterWalkOrHBP: true, noAppealLeague: true,
    inningFlyRule: false, fullBattingOrder: true,
    maxDefensivePlayers: 10, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: '11" Regulation Fast-Pitch Softball (Optic Yellow)',
    pitchChartRequired: false,
  },

  'softball:11-13U': {
    label: '11-13U Softball', sport: SPORT.SOFTBALL, ageGroup: '11-13U', appendix: 'N',
    basesDistanceFt: 60, pitchingDistFt: 40,
    innings: 6, timeCapMinutes: 85, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.KID_ONLY, coachPitchUnderhand: false, teeAllowed: false,
    atBatModel: 'standard', maxBalls: 4, maxStrikes: 3,
    walksAllowed: true, strikeoutsAllowed: true, droppedThirdStrikeIsOut: false,
    pitchingRules: 'USA Softball',
    stealRule: STEAL_RULE.FULL, leadOffsAllowed: false, canStealHome: true,
    stealTrigger: 'pitcher_hand', noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: true,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: '12" Regulation Fast-Pitch Softball (Optic Yellow)',
    pitchChartRequired: false,
  },

  'softball:14-18U': {
    label: '14-18U Softball', sport: SPORT.SOFTBALL, ageGroup: '14-18U', appendix: 'O',
    basesDistanceFt: 60, pitchingDistFt: 43,
    innings: 7, timeCapMinutes: 85, runLimitPerInning: 5, runLimitFinalInning: 10,
    minPlayersToStart: 7, minPlayersToFinish: 7,
    pitchingMode: PITCHING_MODE.KID_ONLY, coachPitchUnderhand: false, teeAllowed: false,
    atBatModel: 'standard', maxBalls: 4, maxStrikes: 3,
    walksAllowed: true, strikeoutsAllowed: true, droppedThirdStrikeIsOut: false,
    pitchingRules: 'USA Softball',
    stealRule: STEAL_RULE.FULL, leadOffsAllowed: false, canStealHome: true,
    stealTrigger: 'pitcher_hand', noAppealLeague: true,
    inningFlyRule: true, fullBattingOrder: false, minPlayRequirement: false,
    maxDefensivePlayers: 9, catcherRequired: true, onFieldCoachesDefense: 0,
    ballSpec: '12" Regulation Fast-Pitch Softball (Optic Yellow)',
    pitchChartRequired: false, metalCleatsAllowed: true,
  },
};

export function getRules(sport, ageGroup) {
  var key = sport + ':' + ageGroup;
  var profile = RULE_PROFILES[key];
  if (!profile) {
    throw new Error('No rule profile found for "' + key + '". Valid keys: ' + Object.keys(RULE_PROFILES).join(', '));
  }
  return profile;
}

export function getRulesForTeam(team) {
  return getRules(team.sport, team.ageGroup);
}

export function getAgeGroups(sport) {
  return Object.keys(RULE_PROFILES)
    .filter(function(k) { return k.startsWith(sport + ':'); })
    .map(function(k) { return RULE_PROFILES[k]; });
}

export function processPitch(rules, currentCount, pitchType) {
  var count = Object.assign(
    { balls: 0, strikes: 0, attempts: 0, coachPitchesRemaining: 0, isCoachPitching: false },
    currentCount
  );
  var warnings = [];
  var atBatResult = null;
  var isCoachPitching = count.isCoachPitching;

  if (rules.pitchingMode === PITCHING_MODE.HYBRID && !isCoachPitching) {
    if (count.balls >= rules.maxBalls) {
      isCoachPitching = true;
      count.coachPitchesRemaining = rules.coachPitchesOnBallFour || 2;
      warnings.push('Ball ' + count.balls + ' — Coach pitcher entering for ' + count.coachPitchesRemaining + ' pitches.');
    }
  }

  if (rules.atBatModel === 'attempts' || rules.atBatModel === 'strikes_or_attempts') {
    count.attempts++;
    var isLastAttempt = count.attempts >= rules.maxAttempts;
    if (pitchType === PITCH_TYPE.CONTACT) {
      atBatResult = AT_BAT_RESULT.IN_PROGRESS;
    } else if (pitchType === PITCH_TYPE.FOUL) {
      if (isLastAttempt) {
        warnings.push('Foul ball on attempt ' + count.attempts + '. Batter gets another attempt.');
        count.attempts = rules.maxAttempts - 1;
      }
      if (rules.atBatModel === 'strikes_or_attempts' && count.strikes < rules.maxStrikes - 1) {
        count.strikes++;
      }
    } else if (pitchType === PITCH_TYPE.STRIKE_CALLED || pitchType === PITCH_TYPE.STRIKE_SWINGING || pitchType === PITCH_TYPE.ATTEMPT_TAKEN) {
      if (rules.atBatModel === 'strikes_or_attempts') {
        count.strikes++;
        if (count.strikes >= rules.maxStrikes) { atBatResult = AT_BAT_RESULT.STRIKEOUT; }
      }
    }
    if (!atBatResult && count.attempts >= rules.maxAttempts) {
      atBatResult = AT_BAT_RESULT.OUT_ATTEMPTS;
    }

  } else if (rules.atBatModel === 'standard') {
    if (pitchType === PITCH_TYPE.BALL) {
      count.balls++;
      if (count.balls >= rules.maxBalls && rules.walksAllowed) { atBatResult = AT_BAT_RESULT.WALK; }
    } else if (pitchType === PITCH_TYPE.STRIKE_CALLED || pitchType === PITCH_TYPE.STRIKE_SWINGING) {
      count.strikes++;
      if (count.strikes >= rules.maxStrikes) { atBatResult = AT_BAT_RESULT.STRIKEOUT; }
    } else if (pitchType === PITCH_TYPE.FOUL) {
      if (count.strikes < rules.maxStrikes - 1) { count.strikes++; }
    } else if (pitchType === PITCH_TYPE.CONTACT) {
      atBatResult = AT_BAT_RESULT.IN_PROGRESS;
    }

  } else if (rules.atBatModel === 'hybrid') {
    if (isCoachPitching) {
      count.coachPitchesRemaining--;
      if (pitchType === PITCH_TYPE.FOUL && count.coachPitchesRemaining <= 0) {
        count.coachPitchesRemaining = 1;
        warnings.push('Foul on coach pitch — batter gets one more pitch.');
      } else if (pitchType === PITCH_TYPE.CONTACT) {
        atBatResult = AT_BAT_RESULT.IN_PROGRESS;
      } else if (pitchType === PITCH_TYPE.STRIKE_CALLED || pitchType === PITCH_TYPE.STRIKE_SWINGING) {
        count.strikes++;
        if (count.strikes >= rules.maxStrikes) { atBatResult = AT_BAT_RESULT.STRIKEOUT; }
      } else if (count.coachPitchesRemaining <= 0) {
        atBatResult = AT_BAT_RESULT.STRIKEOUT;
      }
    } else {
      if (pitchType === PITCH_TYPE.BALL) {
        count.balls++;
        if (count.balls >= rules.maxBalls) { warnings.push('Ball 4 — coach pitcher entering.'); }
      } else if (pitchType === PITCH_TYPE.STRIKE_CALLED || pitchType === PITCH_TYPE.STRIKE_SWINGING) {
        count.strikes++;
        if (count.strikes >= rules.maxStrikes) { atBatResult = AT_BAT_RESULT.STRIKEOUT; }
      } else if (pitchType === PITCH_TYPE.FOUL) {
        if (count.strikes < rules.maxStrikes - 1) { count.strikes++; }
        else { warnings.push('Foul on 2-strike count — at-bat continues.'); }
      } else if (pitchType === PITCH_TYPE.CONTACT) {
        atBatResult = AT_BAT_RESULT.IN_PROGRESS;
      }
    }
  }

  var displayCount;
  if (rules.atBatModel === 'attempts') {
    displayCount = 'Attempt ' + count.attempts + ' of ' + rules.maxAttempts + (isCoachPitching ? ' (Coach Pitch)' : '');
  } else if (rules.atBatModel === 'strikes_or_attempts') {
    displayCount = 'B — S' + count.strikes + ' · Attempt ' + count.attempts + ' of ' + rules.maxAttempts;
  } else if (rules.atBatModel === 'hybrid') {
    displayCount = isCoachPitching
      ? 'B' + count.balls + ' S' + count.strikes + ' · Coach Pitch (' + count.coachPitchesRemaining + ' left)'
      : 'B' + count.balls + ' S' + count.strikes + ' (Kid Pitch)';
  } else {
    displayCount = 'B' + count.balls + ' S' + count.strikes;
  }

  return {
    balls: count.balls, strikes: count.strikes,
    attempts: count.attempts, coachPitchesRemaining: count.coachPitchesRemaining,
    isCoachPitching: isCoachPitching,
    atBatResult: atBatResult || AT_BAT_RESULT.IN_PROGRESS,
    isResolved: atBatResult !== null && atBatResult !== AT_BAT_RESULT.IN_PROGRESS,
    needsContactOutcome: atBatResult === AT_BAT_RESULT.IN_PROGRESS && pitchType === PITCH_TYPE.CONTACT,
    displayCount: displayCount, warnings: warnings,
  };
}

export function isRunLimitReached(rules, inning, totalInnings, runsThisInning) {
  var isLastInning = inning >= totalInnings;
  var limit = isLastInning ? (rules.runLimitFinalInning || Infinity) : (rules.runLimitPerInning || Infinity);
  return runsThisInning >= limit;
}

export function isMercyRuleTriggered(rules, inning, runDifferential) {
  if (!rules.mercyRules) return false;
  for (var i = 0; i < rules.mercyRules.length; i++) {
    var r = rules.mercyRules[i];
    if (inning >= r.afterInning && runDifferential >= r.runDiff) return true;
  }
  return false;
}

export function validateSteal(rules, fromBase) {
  if (rules.stealRule === STEAL_RULE.NOT_ALLOWED) {
    return { allowed: false, reason: 'Stealing is not permitted in this age group.', trigger: null };
  }
  if (rules.stealRule === STEAL_RULE.LIMITED && fromBase === 3) {
    return { allowed: false, reason: 'Stealing home is not permitted in this age group.', trigger: null };
  }
  var triggerLabel = rules.stealTrigger === 'pitcher_hand'
    ? 'Runners may leave when the pitcher releases the ball.'
    : 'Runners may leave when the ball crosses home plate.';
  return { allowed: true, reason: null, trigger: triggerLabel };
}

export function getPitchUIConfig(rules) {
  var config = {
    showBallButton: false, showCalledStrike: false, showSwingMiss: false,
    showFoul: true, showContact: true, showAttemptButton: false,
    showCoachOverlay: false, attemptLabel: 'Attempt', ballLabel: 'Ball',
    maxAttempts: rules.maxAttempts || null, displayMode: rules.atBatModel,
  };
  switch (rules.atBatModel) {
    case 'attempts':
      config.showAttemptButton = true; break;
    case 'strikes_or_attempts':
      config.showAttemptButton = true; config.showCalledStrike = true; config.showSwingMiss = true; break;
    case 'hybrid':
      config.showBallButton = true; config.showCalledStrike = true;
      config.showSwingMiss = true; config.showCoachOverlay = true; break;
    case 'standard':
    default:
      config.showBallButton = rules.walksAllowed; config.showCalledStrike = true; config.showSwingMiss = true; break;
  }
  return config;
}

export function validatePitcherEligibility(rules, pitcherStats) {
  if (!rules.pitchChartRequired) return { eligible: true, reason: null };
  if (rules.maxInningsPerGame && pitcherStats.inningsThisGame >= rules.maxInningsPerGame) {
    return { eligible: false, reason: 'Pitcher has reached the ' + rules.maxInningsPerGame + '-inning per game limit.' };
  }
  if (rules.maxInningsPerWeek && pitcherStats.inningsThisWeek >= rules.maxInningsPerWeek) {
    return { eligible: false, reason: 'Pitcher has reached the ' + rules.maxInningsPerWeek + '-inning per week limit.' };
  }
  if (rules.restRequiredAfterMaxGameInnings && pitcherStats.pitchedMaxLastGame) {
    return { eligible: false, reason: 'Pitcher threw maximum innings in last game — requires 1 day of rest.' };
  }
  return { eligible: true, reason: null };
}

export default {
  getRules, getRulesForTeam, getAgeGroups, processPitch,
  isRunLimitReached, isMercyRuleTriggered, validateSteal,
  getPitchUIConfig, validatePitcherEligibility,
  SPORT, PITCH_TYPE, AT_BAT_RESULT, STEAL_RULE, STEAL_TRIGGER, PITCHING_MODE,
};
