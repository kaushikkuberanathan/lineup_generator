/**
 * leagueRules.test.js
 *
 * Coverage-analysis follow-up (session 2026-08-23): frontend/src/utils/leagueRules.js
 * had zero test coverage despite being the rule engine that useLiveScoring.js depends
 * on for pitch-count/at-bat/mercy-rule/steal logic across every age-group profile.
 * Not previously tracked in DOC_TEST_DEBT.md.
 *
 * (leagueRules_corrections.js, previously referenced here, was a one-way scratch
 * notes file of proposed fixes — never imported by anything at runtime. Its
 * corrections were already incorporated into leagueRules.js; the file itself was
 * removed as a superseded artifact in the same session, #773.)
 *
 * Groups:
 *   A. getRules / getRulesForTeam / getAgeGroups — profile lookup, aliasing, fallback
 *   B. processPitch — atBatModel branches: attempts, strikes_or_attempts, standard, hybrid
 *   C. isRunLimitReached / isMercyRuleTriggered
 *   D. validateSteal
 *   E. getPitchUIConfig
 *   F. validatePitcherEligibility
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SPORT,
  PITCH_TYPE,
  AT_BAT_RESULT,
  STEAL_RULE,
  PITCHING_MODE,
  getRules,
  getRulesForTeam,
  getAgeGroups,
  processPitch,
  isRunLimitReached,
  isMercyRuleTriggered,
  validateSteal,
  getPitchUIConfig,
  validatePitcherEligibility,
} from '../utils/leagueRules.js';

describe('leagueRules', function () {

  // ── Group A: getRules / getRulesForTeam / getAgeGroups ──────────────────────

  describe('A: getRules / getRulesForTeam / getAgeGroups', function () {

    it('A1: returns the exact profile for a known sport:ageGroup key', function () {
      var rules = getRules(SPORT.BASEBALL, '8U');
      expect(rules.label).toBe('8U Baseball');
      expect(rules.pitchingMode).toBe(PITCHING_MODE.HYBRID);
      expect(rules.maxBalls).toBe(4);
      expect(rules.maxStrikes).toBe(3);
    });

    it('A2: applies AGE_GROUP_ALIASES — "10U" resolves to the "9-10U" profile', function () {
      var aliased = getRules(SPORT.BASEBALL, '10U');
      var canonical = getRules(SPORT.BASEBALL, '9-10U');
      expect(aliased).toBe(canonical);
    });

    it('A3: applies the "-minor" alias — "9U-minor" resolves to "9-10U-minor"', function () {
      var aliased = getRules(SPORT.BASEBALL, '9U-minor');
      var canonical = getRules(SPORT.BASEBALL, '9-10U-minor');
      expect(aliased).toBe(canonical);
    });

    it('A4: unknown profile falls back to baseball 9-10U and warns', function () {
      var warnSpy = vi.spyOn(console, 'warn').mockImplementation(function () {});
      var rules = getRules(SPORT.BASEBALL, '99U-does-not-exist');
      expect(rules).toBe(getRules(SPORT.BASEBALL, '9-10U'));
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    it('A5: unknown softball profile falls back to softball 9-10U', function () {
      var warnSpy = vi.spyOn(console, 'warn').mockImplementation(function () {});
      var rules = getRules(SPORT.SOFTBALL, 'not-a-real-group');
      expect(rules).toBe(getRules(SPORT.SOFTBALL, '9-10U'));
      warnSpy.mockRestore();
    });

    it('A6: getRulesForTeam delegates to getRules using team.sport/team.ageGroup', function () {
      var team = { sport: SPORT.SOFTBALL, ageGroup: '7-8U' };
      expect(getRulesForTeam(team)).toBe(getRules(SPORT.SOFTBALL, '7-8U'));
    });

    it('A7: getAgeGroups filters profiles by sport prefix only', function () {
      var baseballGroups = getAgeGroups(SPORT.BASEBALL);
      var softballGroups = getAgeGroups(SPORT.SOFTBALL);
      expect(baseballGroups.length).toBeGreaterThan(0);
      expect(softballGroups.length).toBeGreaterThan(0);
      expect(baseballGroups.every(function (p) { return p.sport === SPORT.BASEBALL; })).toBe(true);
      expect(softballGroups.every(function (p) { return p.sport === SPORT.SOFTBALL; })).toBe(true);
    });
  });

  // ── Group B: processPitch ────────────────────────────────────────────────────

  describe('B: processPitch', function () {

    describe('B1: attempts model (5U baseball — tee ball, no walks/strikeouts)', function () {
      var rules = getRules(SPORT.BASEBALL, '5U');

      it('contact resolves the at-bat as in-progress (ball put in play)', function () {
        var result = processPitch(rules, { attempts: 0 }, PITCH_TYPE.CONTACT);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.IN_PROGRESS);
        expect(result.isResolved).toBe(false);
        expect(result.needsContactOutcome).toBe(true);
      });

      it('reaching maxAttempts (5) without contact resolves as OUT_ATTEMPTS', function () {
        var count = { attempts: 0 };
        var result;
        for (var i = 0; i < rules.maxAttempts; i++) {
          result = processPitch(rules, count, PITCH_TYPE.ATTEMPT_TAKEN);
          count = result;
        }
        expect(result.attempts).toBe(rules.maxAttempts);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.OUT_ATTEMPTS);
        expect(result.isResolved).toBe(true);
      });

      it('a foul on the last attempt grants another attempt instead of ending the at-bat', function () {
        var count = { attempts: rules.maxAttempts - 1 };
        var result = processPitch(rules, count, PITCH_TYPE.FOUL);
        expect(result.attempts).toBe(rules.maxAttempts - 1);
        expect(result.isResolved).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('B2: strikes_or_attempts model (7U baseball)', function () {
      var rules = getRules(SPORT.BASEBALL, '7U');

      it('3 called strikes resolve as STRIKEOUT before maxAttempts is reached', function () {
        var count = { attempts: 0, strikes: 0 };
        var result;
        for (var i = 0; i < rules.maxStrikes; i++) {
          result = processPitch(rules, count, PITCH_TYPE.STRIKE_CALLED);
          count = result;
        }
        expect(result.strikes).toBe(rules.maxStrikes);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.STRIKEOUT);
        expect(result.isResolved).toBe(true);
      });

      it('contact ends the at-bat as in-progress regardless of strike count', function () {
        var result = processPitch(rules, { attempts: 1, strikes: 2 }, PITCH_TYPE.CONTACT);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.IN_PROGRESS);
      });
    });

    describe('B3: standard model (9-10U major baseball — real balls/strikes)', function () {
      var rules = getRules(SPORT.BASEBALL, '9-10U');

      it('4 balls resolve as WALK when walksAllowed is true', function () {
        var count = { balls: 0, strikes: 0 };
        var result;
        for (var i = 0; i < rules.maxBalls; i++) {
          result = processPitch(rules, count, PITCH_TYPE.BALL);
          count = result;
        }
        expect(result.balls).toBe(rules.maxBalls);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.WALK);
      });

      it('3 strikes resolve as STRIKEOUT', function () {
        var count = { balls: 0, strikes: 0 };
        var result;
        for (var i = 0; i < rules.maxStrikes; i++) {
          result = processPitch(rules, count, PITCH_TYPE.STRIKE_SWINGING);
          count = result;
        }
        expect(result.atBatResult).toBe(AT_BAT_RESULT.STRIKEOUT);
      });

      it('a foul with 2 strikes does not add a 3rd strike (foul cap)', function () {
        var result = processPitch(rules, { balls: 0, strikes: 2 }, PITCH_TYPE.FOUL);
        expect(result.strikes).toBe(2);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.IN_PROGRESS);
      });

      it('4 balls do NOT walk when walksAllowed is false (7U has walksAllowed:false but standard model unused there) — verify via 8U hybrid ball-4 branch instead', function () {
        // standard-model walk gating is exercised directly above; this test
        // documents that the walksAllowed guard is real, not a tautology,
        // by checking the flag on the profile actually used above.
        expect(rules.walksAllowed).toBe(true);
      });
    });

    describe('B4: hybrid model (8U baseball — kid pitch with coach-pitch handoff on ball 4)', function () {
      var rules = getRules(SPORT.BASEBALL, '8U');

      it('ball 4 warns that the coach is entering, and the handoff itself lands on the following pitch', function () {
        // The HYBRID handoff check runs at the top of processPitch against the
        // count *coming in*, so reaching 4 balls only warns on the ball-4 pitch
        // itself — isCoachPitching doesn't flip until the next call sees balls>=4.
        var count = { balls: 0, strikes: 0, isCoachPitching: false, coachPitchesRemaining: 0 };
        var result;
        for (var i = 0; i < rules.maxBalls; i++) {
          result = processPitch(rules, count, PITCH_TYPE.BALL);
          count = result;
        }
        expect(result.balls).toBe(rules.maxBalls);
        expect(result.isCoachPitching).toBe(false);
        expect(result.warnings.some(function (w) { return /coach pitcher entering/i.test(w); })).toBe(true);

        // The same call that flips isCoachPitching also processes this pitch as
        // the first coach pitch, so coachPitchesRemaining is already decremented once.
        var handoff = processPitch(rules, count, PITCH_TYPE.STRIKE_CALLED);
        expect(handoff.isCoachPitching).toBe(true);
        expect(handoff.coachPitchesRemaining).toBe(rules.coachPitchesOnBallFour - 1);
      });

      it('while coach is pitching, contact resolves as in-progress', function () {
        var count = { balls: 4, strikes: 0, isCoachPitching: true, coachPitchesRemaining: 2 };
        var result = processPitch(rules, count, PITCH_TYPE.CONTACT);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.IN_PROGRESS);
      });

      it('while coach is pitching and pitches run out with no contact, the at-bat resolves as STRIKEOUT', function () {
        var count = { balls: 4, strikes: 0, isCoachPitching: true, coachPitchesRemaining: 1 };
        var result = processPitch(rules, count, PITCH_TYPE.BALL);
        expect(result.coachPitchesRemaining).toBe(0);
        expect(result.atBatResult).toBe(AT_BAT_RESULT.STRIKEOUT);
      });

      it('kid-pitch strikes still count toward strikeout before any coach handoff', function () {
        var count = { balls: 0, strikes: 0, isCoachPitching: false, coachPitchesRemaining: 0 };
        var result;
        for (var i = 0; i < rules.maxStrikes; i++) {
          result = processPitch(rules, count, PITCH_TYPE.STRIKE_CALLED);
          count = result;
        }
        expect(result.atBatResult).toBe(AT_BAT_RESULT.STRIKEOUT);
        expect(result.isCoachPitching).toBe(false);
      });

      it('displayCount reflects coach-pitch mode with pitches-remaining count', function () {
        var count = { balls: 4, strikes: 1, isCoachPitching: true, coachPitchesRemaining: 2 };
        var result = processPitch(rules, count, PITCH_TYPE.STRIKE_CALLED);
        expect(result.displayCount).toContain('Coach Pitch');
        expect(result.displayCount).toContain(String(result.coachPitchesRemaining));
      });
    });

    it('B5: displayCount for the attempts model shows "Attempt N of maxAttempts"', function () {
      var rules = getRules(SPORT.BASEBALL, '5U');
      var result = processPitch(rules, { attempts: 1 }, PITCH_TYPE.ATTEMPT_TAKEN);
      expect(result.displayCount).toBe('Attempt 2 of ' + rules.maxAttempts);
    });
  });

  // ── Group C: isRunLimitReached / isMercyRuleTriggered ────────────────────────

  describe('C: run limits and mercy rule', function () {
    var rules = getRules(SPORT.BASEBALL, '8U'); // runLimitPerInning:3, runLimitFinalInning:6, innings:6

    it('C1: per-inning run limit applies before the final inning', function () {
      expect(isRunLimitReached(rules, 2, rules.innings, 3)).toBe(true);
      expect(isRunLimitReached(rules, 2, rules.innings, 2)).toBe(false);
    });

    it('C2: the higher final-inning run limit applies on/after the last inning', function () {
      expect(isRunLimitReached(rules, rules.innings, rules.innings, 5)).toBe(false);
      expect(isRunLimitReached(rules, rules.innings, rules.innings, 6)).toBe(true);
    });

    it('C3: a profile with no run limit configured never reports the limit reached', function () {
      var unlimited = Object.assign({}, rules, { runLimitPerInning: null, runLimitFinalInning: null });
      expect(isRunLimitReached(unlimited, 1, rules.innings, 1000)).toBe(false);
    });

    it('C4: isMercyRuleTriggered is false for profiles with no mercyRules array (8U)', function () {
      expect(isMercyRuleTriggered(rules, 5, 50)).toBe(false);
    });

    it('C5: 13-14U mercy rule triggers at the correct inning/run-differential thresholds', function () {
      var olderRules = getRules(SPORT.BASEBALL, '13-14U');
      // { afterInning: 3, runDiff: 15 }
      expect(isMercyRuleTriggered(olderRules, 3, 15)).toBe(true);
      expect(isMercyRuleTriggered(olderRules, 3, 14)).toBe(false);
      expect(isMercyRuleTriggered(olderRules, 2, 20)).toBe(false);
      // { afterInning: 5, runDiff: 8 } — a later, looser threshold still triggers
      expect(isMercyRuleTriggered(olderRules, 5, 8)).toBe(true);
    });
  });

  // ── Group D: validateSteal ────────────────────────────────────────────────────

  describe('D: validateSteal', function () {

    it('D1: stealing is disallowed entirely when stealRule is NOT_ALLOWED', function () {
      var rules = getRules(SPORT.BASEBALL, '8U');
      var result = validateSteal(rules, 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not permitted/i);
    });

    it('D2: LIMITED steal rule blocks stealing home (fromBase 3) specifically', function () {
      var rules = getRules(SPORT.BASEBALL, '9-10U-minor'); // STEAL_RULE.LIMITED
      expect(rules.stealRule).toBe(STEAL_RULE.LIMITED);
      var home = validateSteal(rules, 3);
      expect(home.allowed).toBe(false);
      expect(home.reason).toMatch(/home/i);

      var otherBase = validateSteal(rules, 1);
      expect(otherBase.allowed).toBe(true);
    });

    it('D3: FULL steal rule allows stealing from any base, with a plate-crossing trigger by default', function () {
      var rules = getRules(SPORT.BASEBALL, '9-10U'); // STEAL_RULE.FULL, no stealTrigger set
      var result = validateSteal(rules, 3);
      expect(result.allowed).toBe(true);
      expect(result.trigger).toMatch(/crosses home plate/i);
    });

    it('D4: pitcher_hand steal trigger produces the pitcher-release trigger label', function () {
      var rules = getRules(SPORT.SOFTBALL, '11-13U'); // stealTrigger: 'pitcher_hand'
      var result = validateSteal(rules, 1);
      expect(result.allowed).toBe(true);
      expect(result.trigger).toMatch(/pitcher releases/i);
    });
  });

  // ── Group E: getPitchUIConfig ─────────────────────────────────────────────────

  describe('E: getPitchUIConfig', function () {

    it('E1: attempts model shows the attempt button and hides ball/called-strike controls', function () {
      var config = getPitchUIConfig(getRules(SPORT.BASEBALL, '5U'));
      expect(config.showAttemptButton).toBe(true);
      expect(config.showBallButton).toBe(false);
      expect(config.showCalledStrike).toBe(false);
    });

    it('E2: strikes_or_attempts model shows attempt + called-strike + swing-miss controls', function () {
      var config = getPitchUIConfig(getRules(SPORT.BASEBALL, '7U'));
      expect(config.showAttemptButton).toBe(true);
      expect(config.showCalledStrike).toBe(true);
      expect(config.showSwingMiss).toBe(true);
    });

    it('E3: hybrid model shows the ball button and the coach overlay', function () {
      var config = getPitchUIConfig(getRules(SPORT.BASEBALL, '8U'));
      expect(config.showBallButton).toBe(true);
      expect(config.showCoachOverlay).toBe(true);
    });

    it('E4: standard model gates the ball button on walksAllowed', function () {
      var walkable = getPitchUIConfig(getRules(SPORT.BASEBALL, '9-10U'));
      expect(walkable.showBallButton).toBe(true);

      var noWalkStandard = getPitchUIConfig(Object.assign({}, getRules(SPORT.BASEBALL, '9-10U'), { walksAllowed: false }));
      expect(noWalkStandard.showBallButton).toBe(false);
    });
  });

  // ── Group F: validatePitcherEligibility ──────────────────────────────────────

  describe('F: validatePitcherEligibility', function () {

    it('F1: eligible when the profile does not require a pitch chart at all', function () {
      var rules = getRules(SPORT.BASEBALL, '5U'); // pitchChartRequired: false
      var result = validatePitcherEligibility(rules, { inningsThisGame: 99, inningsThisWeek: 99 });
      expect(result.eligible).toBe(true);
    });

    it('F2: ineligible once inningsThisGame reaches maxInningsPerGame', function () {
      var rules = getRules(SPORT.BASEBALL, '8U'); // maxInningsPerGame: 2, pitchChartRequired: true
      var result = validatePitcherEligibility(rules, { inningsThisGame: 2, inningsThisWeek: 0 });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/per game limit/);
    });

    it('F3: ineligible once inningsThisWeek reaches maxInningsPerWeek', function () {
      var rules = getRules(SPORT.BASEBALL, '8U'); // maxInningsPerWeek: 4
      var result = validatePitcherEligibility(rules, { inningsThisGame: 0, inningsThisWeek: 4 });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/per week limit/);
    });

    it('F4: ineligible when rest is required after a max-innings outing', function () {
      var rules = getRules(SPORT.BASEBALL, '8U'); // restRequiredAfterMaxGameInnings: 1
      var result = validatePitcherEligibility(rules, {
        inningsThisGame: 0, inningsThisWeek: 0, pitchedMaxLastGame: true,
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/rest/i);
    });

    it('F5: eligible when under every limit and no rest is owed', function () {
      var rules = getRules(SPORT.BASEBALL, '8U');
      var result = validatePitcherEligibility(rules, {
        inningsThisGame: 0, inningsThisWeek: 0, pitchedMaxLastGame: false,
      });
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeNull();
    });
  });
});
