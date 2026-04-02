/**
 * migrations.js — pure data-migration utilities extracted from App.jsx.
 *
 * All functions here are side-effect-free (no localStorage, no React state).
 * They transform plain JS objects and are safe to import in any environment.
 *
 * Extracted so they can be unit-tested directly without importing the full App.
 */

/**
 * Normalises a roster array to the current V2 player shape.
 * - Preserves all existing fields via spread (future fields are not dropped).
 * - Renames legacy `needsRoutine` skill to `developing`.
 * - Applies ?? defaults for every V2 attribute.
 */
export function migrateRoster(roster) {
  if (!Array.isArray(roster)) { return roster; }
  return roster.map(function(p) {
    var skills = p.skills || [];
    // Legacy migration: needsRoutine was renamed to developing in v2 badge redesign
    if (skills.indexOf("needsRoutine") >= 0) {
      if (skills.indexOf("developing") < 0) {
        skills = skills.map(function(s) { return s === "needsRoutine" ? "developing" : s; });
      } else {
        skills = skills.filter(function(s) { return s !== "needsRoutine"; });
      }
    }
    return {
      // Spread all existing fields first so any future fields are preserved
      // through migration without being silently dropped.
      ...p,
      // Explicit fields below normalize values and apply safe defaults.
      // They override whatever was spread above (intentional).
      name:      p.name      || "",
      skills:    skills,
      tags:      p.tags      || [],
      dislikes:  p.dislikes  || [],
      prefs:     p.prefs     || [],
      batSkills: p.batSkills || [],
      // V2 fielding
      reliability:        p.reliability        ?? "average",
      reaction:           p.reaction           ?? "average",
      armStrength:        p.armStrength        ?? "average",
      ballType:           p.ballType           ?? "developing",
      knowsWhereToThrow:  p.knowsWhereToThrow  ?? false,
      callsForBall:       p.callsForBall       ?? false,
      backsUpPlays:       p.backsUpPlays       ?? false,
      anticipatesPlays:   p.anticipatesPlays   ?? false,
      // V2 batting
      contact:            p.contact            ?? "medium",
      power:              p.power              ?? "low",
      swingDiscipline:    p.swingDiscipline    ?? "free_swinger",
      tracksBallWell:     p.tracksBallWell     ?? false,
      patientAtPlate:     p.patientAtPlate     ?? false,
      confidentHitter:    p.confidentHitter    ?? false,
      // V2 base running
      speed:              p.speed              ?? "average",
      runsThroughFirst:   p.runsThroughFirst   ?? false,
      listensToCoaches:   p.listensToCoaches   ?? false,
      awareOnBases:       p.awareOnBases       ?? false,
      // V2 effort & development
      effort:             p.effort             ?? null,
      developmentFocus:   p.developmentFocus   ?? "balanced",
      // V2 game-day constraints
      skipBench:          p.skipBench          ?? false,
      outThisGame:        p.outThisGame        ?? false,
      lastUpdated:        p.lastUpdated        ?? null,
      firstName:          p.firstName          ?? (p.name ? p.name.split(" ")[0] : ""),
      lastName:           p.lastName           ?? (p.name ? p.name.split(" ").slice(1).join(" ") : ""),
      // Walk-up songs
      walkUpSong:         p.walkUpSong         ?? null,
      walkUpArtist:       p.walkUpArtist       ?? null,
      walkUpStart:        p.walkUpStart        ?? null,
      walkUpEnd:          p.walkUpEnd          ?? null,
      walkUpNotes:        p.walkUpNotes        ?? null,
      walkUpLink:         p.walkUpLink         ?? null
    };
  });
}

/**
 * Normalises a schedule array to the current game object shape.
 * Preserves all existing fields (Object.assign spread); scoreReported and any
 * future fields not listed in the override block survive unchanged.
 */
export function migrateSchedule(schedule) {
  if (!Array.isArray(schedule)) { return schedule; }
  return schedule.map(function(g) {
    return Object.assign({}, g, {
      id:          g.id          || (Date.now() + ""),
      date:        g.date        || "",
      time:        g.time        || "",
      location:    g.location    || "",
      opponent:    g.opponent    || "",
      result:      g.result      || "",
      ourScore:    g.ourScore    || "",
      theirScore:  g.theirScore  || "",
      home:        g.home        ?? false,
      snackDuty:   g.snackDuty   || "",
      snackNote:   g.snackNote   || "",
      gameBall:    g.gameBall    || "",
      battingPerf: g.battingPerf || {}
    });
  });
}

/**
 * Remaps old "J Smith" batting-perf key format to full "John Smith" name keys
 * so stats survive a roster rename or initial-format change.
 */
export function migrateBattingPerf(schedule, roster) {
  if (!schedule || !roster || roster.length === 0) return schedule;
  return schedule.map(function(game) {
    if (!game.battingPerf || Object.keys(game.battingPerf).length === 0) return game;
    var keys = Object.keys(game.battingPerf);
    var needsMigration = keys.some(function(k) {
      return !roster.find(function(p) { return p.name === k; });
    });
    if (!needsMigration) return game;
    var newPerf = {};
    keys.forEach(function(oldKey) {
      var match = roster.find(function(p) {
        var parts = p.name.split(' ');
        var initial = parts[0].charAt(0);
        var lastName = parts.slice(1).join(' ');
        return (initial + ' ' + lastName) === oldKey || p.name === oldKey;
      });
      if (match) {
        newPerf[match.name] = game.battingPerf[oldKey];
      } else {
        newPerf[oldKey] = game.battingPerf[oldKey];
      }
    });
    return Object.assign({}, game, { battingPerf: newPerf });
  });
}

/**
 * Merges locally-set fields from a local schedule snapshot into a freshly
 * migrated DB schedule. Used during Supabase hydration to prevent local
 * flags (scoreReported, snackDuty, gameBall, snackNote) being silently wiped
 * by a stale DB version that hasn't received the local write yet.
 *
 * Rule: local value wins only when local[field] is truthy AND db[field] is falsy.
 * This preserves the coach's local edits without overwriting intentional DB clears.
 *
 * @param {Array}  dbSchedule    - schedule from Supabase, already migrated
 * @param {Array}  localSchedule - schedule from localStorage before hydration started
 * @param {Array}  fields        - field names to rescue (e.g. MERGE_FIELDS)
 * @returns {Array} merged schedule
 */
export function mergeLocalScheduleFields(dbSchedule, localSchedule, fields) {
  return dbSchedule.map(function(g) {
    var local = localSchedule.find(function(x) { return x.id === g.id; });
    if (!local) return g;
    var merged = Object.assign({}, g);
    fields.forEach(function(field) {
      if (local[field] && !g[field]) merged[field] = local[field];
    });
    return merged;
  });
}
