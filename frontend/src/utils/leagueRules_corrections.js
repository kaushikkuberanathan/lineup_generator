/**
 * CORRECTIONS to leagueRules.js — verified against full 2026 FCPRD rulebook PDF
 * Apply these changes to frontend/src/utils/leagueRules.js
 *
 * 6 factual errors found and corrected below.
 * Source: Appendices A, F, G, H, M, N, O + Appendix P summary table.
 */

// ─── CORRECTION 1: 5U Baseball base distance ─────────────────────────────────
// ERROR:   basesDistanceFt: 60
// FIX:     basesDistanceFt: 50
// SOURCE:  Appendix A, A.1-A: "Base distance is 50 feet"
// Also:    innings was 6 — ERROR. A.3: "complete game shall be 5 innings"
//          runLimitFinalInning was 10 — ERROR. A.2 only says 5/inning, no final-inning escalation
//          timeCapMinutes was 55 — CORRECT. A.3: "55 minutes"

// 'baseball:5U' corrections:
// basesDistanceFt:    50        (was 60)
// innings:            5         (was 6 — only 5U plays 5 innings)
// runLimitFinalInning: null     (no escalation rule stated for 5U)


// ─── CORRECTION 2: 11-12U Baseball — lead offs ───────────────────────────────
// ERROR:   leadOffsAllowed: false
// FIX:     leadOffsAllowed: true
// SOURCE:  Appendix H, H.9-A: "Runners are allowed to lead off. Runners may steal home."
// NOTE:    This is a meaningful rule difference — 11-12U gets lead offs, 9-10U does not.

// 'baseball:11-12U' corrections:
// leadOffsAllowed:    true      (was false)


// ─── CORRECTION 3: 9-10U Baseball — two separate divisions ──────────────────
// The combined '9-10U' profile was conflating two different rule sets:
//
// Appendix F  = 9-10 MINOR (Fall only)
//   pitchingMode:  HYBRID (F.6 — same as 8U hybrid: kid pitches, coach after ball 4)
//   stealRule:     LIMITED — stealing permitted but NOT home (F.10)
//   maxInnings:    3/game, 6/week (F.7)
//   inningFlyRule: true (F.13)
//
// Appendix G  = 10 MAJOR (Spring)
//   pitchingMode:  KID_ONLY (G.6 — full kid pitch, standard pitching limits)
//   stealRule:     FULL — stealing permitted INCLUDING home (G.9-F)
//   maxInnings:    3/game, 6/week (G.6-C)
//   inningFlyRule: true (G.12)
//
// RECOMMENDATION: Split into two profiles:
//   'baseball:9-10U-minor'  (Fall, hybrid pitching)
//   'baseball:9-10U-major'  (Spring, kid pitch)
// OR keep one profile and add a season/division field the app uses to pick:
//   pitchingMode for minor: HYBRID
//   pitchingMode for major: KID_ONLY


// ─── CORRECTION 4: 9-10U Softball (Appendix M) ───────────────────────────────
// My generated profile was a guess. Now confirmed from PDF:
//
// M.1:  basesDistanceFt: 60, pitchingDistFt: 35
// M.2:  runLimitPerInning: 3, runLimitFinalInning: 6  (was 5/10 — WRONG)
// M.3:  innings: 6, timeCapMinutes: 85
// M.4:  droppedThirdStrikeIsOut: true                 (was false — WRONG)
// M.6:  pitchingMode: HYBRID (underhand), same structure as 8U baseball hybrid
//        walks not allowed, coach enters after ball 4 for 2 pitches
//        foul on kid's 3rd strike or coach's 2nd pitch → batter gets another
// M.7:  Youth pitcher pitches from 35ft rubber
// M.10: stealRule: LIMITED (steal permitted, 1 base/pitch, NO stealing home)
//        canStealHome: false
//        Batter/runner may NOT steal 2B after walk or HBP
// M.13: inningFlyRule: false                          (was false — CORRECT)

// 'softball:9-10U' corrections:
// pitchingDistFt:        35          (was 35 — correct)
// coachPitchUnderhand:   true        (correct)
// runLimitPerInning:     3           (was 5 — WRONG)
// runLimitFinalInning:   6           (was 10 — WRONG)
// droppedThirdStrikeIsOut: true      (was false — WRONG)
// canStealHome:          false       (correct)
// inningFlyRule:         false       (correct)
// maxDefensivePlayers:   10          (M.11: 4 outfielders)


// ─── CORRECTION 5: 11-13U Softball (Appendix N) ──────────────────────────────
// My generated profile was a guess. Now confirmed from PDF:
//
// N.1:  basesDistanceFt: 60, pitchingDistFt: 40
// N.2:  runLimitPerInning: 5, runLimitFinalInning: 10
// N.3:  innings: 6, timeCapMinutes: 85              (was 7 innings — WRONG)
// N.4:  droppedThirdStrikeIsOut: false (batter must be tagged or thrown out at 1st)
// N.6:  pitchingRules: 'USA Softball'
// N.9:  stealRule: FULL, leadOffsAllowed: false
//        IMPORTANT DIFFERENCE: "Runners must stay in contact with the base until
//        the ball LEAVES THE PITCHER'S HAND" — different from baseball (plate crossing)
//        This is the softball steal trigger.
// N.12: inningFlyRule: true                         (was true — correct)

// 'softball:11-13U' corrections:
// pitchingDistFt:        40          (was 40 — correct)
// innings:               6           (was 7 — WRONG)
// runLimitPerInning:     5           (was null — WRONG)
// runLimitFinalInning:   10          (was null — WRONG)
// droppedThirdStrikeIsOut: false     (correct)
// stealTrigger:          'pitcher_hand'  // NEW field — ball leaves pitcher's hand
// maxDefensivePlayers:   9           (correct)
// inningFlyRule:         true        (correct)


// ─── CORRECTION 6: 14-18U Softball (Appendix O) ──────────────────────────────
// My generated profile was a guess. Now confirmed from PDF:
//
// O.1:  basesDistanceFt: 60, pitchingDistFt: 43
// O.2:  runLimitPerInning: 5, runLimitFinalInning: 10 (in 7th inning or extra)
// O.3:  innings: 7, timeCapMinutes: 85
// O.4:  droppedThirdStrikeIsOut: false
// O.6:  pitchingRules: 'USA Softball'
// O.9:  stealRule: FULL, stealTrigger: 'pitcher_hand'
//        "Runners must stay in contact with the base until the ball leaves the pitcher's hand"
// O.12: inningFlyRule: true

// 'softball:14-18U' corrections:
// pitchingDistFt:        43          (was 43 — correct)
// runLimitPerInning:     5           (was null — WRONG)
// runLimitFinalInning:   10          (was null — WRONG)
// stealTrigger:          'pitcher_hand'  // NEW field
// inningFlyRule:         true        (correct)


// ─── NEW: stealTrigger field ──────────────────────────────────────────────────
// Softball stealing is triggered differently from baseball:
// Baseball (9U+):  runners leave when ball CROSSES THE PLATE
// Softball (11U+): runners leave when ball LEAVES THE PITCHER'S HAND
// Add this to the rule profile and to validateSteal():

export const STEAL_TRIGGER = {
  PLATE_CROSSING:  'plate_crossing',  // baseball: ball must cross plate
  PITCHER_HAND:    'pitcher_hand',    // softball 11U+: ball leaves pitcher's hand
  CONTACT_ONLY:    'contact_only',    // coach pitch: must wait until ball is hit (no stealing)
};

// Updated validateSteal() should also check stealTrigger and surface it as UI text:
// "Runners may leave when: [ball crosses plate / pitcher releases ball]"


// ─── Appendix P — official summary table confirms the full matrix ─────────────
// (Use this as ground truth for any future disputes)
//
// BASEBALL:
// Age     Inn  Time    Bases  Pitch      IFF   Lead  Steal Drop3
// 5U       5   55min   50ft   20-42ft    NO    NO    NO    NO
// 6U       6   55min   60ft   20-42ft    NO    NO    NO    NO
// 7-8Min   6   85min   60ft   20-42ft    NO    NO    NO    NO
// 7Maj     6   85min   60ft   20-42ft    NO    NO    NO    NO
// 8Maj     6   85min   60ft   40ft       NO    NO    NO    NO
// 9-10Min  6   85min   65ft   46ft       YES   NO    YES   NO   (limited steal)
// 10Maj    6   85min   65ft   46ft       YES   NO    YES   NO   (full steal incl home)
// 11-12    6   85min   70ft   50ft       YES   YES   YES   YES
// 13-14    7  100min   80ft   54ft       YES   YES   YES   YES
// 15-18    7  115min   90ft   60'6"      YES   YES   YES   YES
//
// SOFTBALL:
// Age      Inn  Time    Bases  Pitch   IFF   Steal  Drop3
// 5-6U      6   55min   50ft   20-35   NO    NO     NO
// 7-8U      6   70min   60ft   20-35   NO    NO     NO
// 9-10U     6   85min   60ft   35ft    NO    YES    NO    (limited: no home)
// 11-13U    6   85min   60ft   40ft    YES   YES    YES   (wait for pitcher release)
// 14-18U    7   85min   60ft   43ft    YES   YES    YES   (wait for pitcher release)
