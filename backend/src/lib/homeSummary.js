/**
 * homeSummary — pure computation helpers for the Home read model
 * (Story #1023). No Supabase calls in this file; the route does all
 * fetching and hands plain data in, so these are trivially unit-testable.
 */

/**
 * Disambiguate team display names within one response.
 * name is the raw stored value and may collide across a caller's teams
 * (e.g. two seasons of the same club). displayName equals name unless
 * another team in the SAME response shares it, in which case season/year
 * (and age group if still colliding) is appended. Section 11.4 / #1022.
 *
 * @param {Array<{id:string,name:string,season:string,year:number,ageGroup:string}>} teams
 * @returns {Map<string,string>} teamId -> displayName
 */
function computeDisplayNames(teams) {
  const byName = new Map();
  for (const t of teams) {
    if (!byName.has(t.name)) byName.set(t.name, []);
    byName.get(t.name).push(t);
  }

  const displayNames = new Map();
  for (const [name, group] of byName) {
    if (group.length === 1) {
      displayNames.set(group[0].id, name);
      continue;
    }
    // Colliding names: append "(Season Year)". If that still collides
    // (same club, same season/year, different age group — a real
    // multi-division org), append the age group too.
    const bySeasonYear = new Map();
    for (const t of group) {
      const key = `${t.season} ${t.year}`;
      if (!bySeasonYear.has(key)) bySeasonYear.set(key, []);
      bySeasonYear.get(key).push(t);
    }
    for (const [seasonYear, sub] of bySeasonYear) {
      if (sub.length === 1) {
        displayNames.set(sub[0].id, `${name} (${seasonYear})`);
      } else {
        for (const t of sub) {
          displayNames.set(t.id, `${name} (${seasonYear}, ${t.ageGroup})`);
        }
      }
    }
  }
  return displayNames;
}

/**
 * @param {Array} schedule - team_data.schedule jsonb array
 * @param {Date} now
 * @returns {object|null} the earliest game/practice at or after `now`, or null
 */
function computeNextEvent(schedule, now) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;

  const upcoming = schedule
    .filter((e) => e && e.date && !e.cancelled)
    .map((e) => ({ raw: e, startsAt: new Date(`${e.date}T${e.time || '00:00'}:00`) }))
    .filter((e) => !Number.isNaN(e.startsAt.getTime()) && e.startsAt.getTime() >= now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (upcoming.length === 0) return null;

  const { raw, startsAt } = upcoming[0];
  return {
    id: raw.id || `${raw.date}_${raw.opponent || raw.type || 'event'}`,
    type: raw.type === 'practice' ? 'practice' : 'game',
    opponent: raw.opponent || null,
    startsAt: startsAt.toISOString(),
    location: raw.location || null,
    homeAway: raw.home === true ? 'home' : raw.home === false ? 'away' : null,
  };
}

/**
 * @param {Array} roster - team_data.roster jsonb array
 * @param {Array} grid - team_data.grid jsonb (2D [inning][position])
 * @param {Array} battingOrder - team_data.batting_order jsonb array
 * @param {boolean} locked - team_data.locked
 * @param {object|null} attendanceOverrides - team_data.attendance_overrides, keyed by date, for the next event's date if any
 * @returns {{rosterCount:number, confirmedCount:number, lineupStatus:'none'|'draft'|'ready', lineupId:null}}
 */
function computeReadiness({ roster, grid, battingOrder, locked, attendanceForNextEvent }) {
  const rosterCount = Array.isArray(roster) ? roster.length : 0;

  let confirmedCount = rosterCount;
  if (attendanceForNextEvent && typeof attendanceForNextEvent === 'object') {
    const absentNames = Object.entries(attendanceForNextEvent)
      .filter(([, status]) => status === 'absent')
      .map(([name]) => name);
    confirmedCount = Math.max(0, rosterCount - absentNames.length);
  }

  const hasGrid = grid && typeof grid === 'object' && Object.keys(grid).length > 0;
  const hasBattingOrder = Array.isArray(battingOrder) && battingOrder.length > 0;
  let lineupStatus = 'none';
  if (locked) {
    lineupStatus = 'ready';
  } else if (hasGrid || hasBattingOrder) {
    lineupStatus = 'draft';
  }

  return {
    rosterCount,
    confirmedCount,
    lineupStatus,
    // No per-game lineup resource exists in the live schema yet (one
    // grid/batting_order per team_data row, not per game) — see
    // homeCapabilities.js's buildActions() header comment. Never fabricate
    // an ID for a resource that isn't independently addressable.
    lineupId: null,
  };
}

module.exports = { computeDisplayNames, computeNextEvent, computeReadiness };
