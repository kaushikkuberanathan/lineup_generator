// localStorage with in-memory fallback + schema migration functions

export var SCHEMA_VERSION = 1;

// STORAGE - localStorage with in-memory fallback
// ============================================================

// Storage: localStorage with in-memory fallback
var _mem = {};


export function loadJSON(key, def) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) { return JSON.parse(raw); }
  } catch (e) {
    try { var mv = _mem[key]; if (mv) { return JSON.parse(mv); } } catch (e2) {}
  }
  return def;
}

export function saveJSON(key, val) {
  var str = JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch (e) { _mem[key] = str; }
}

export function removeJSON(key) {
  try { localStorage.removeItem(key); } catch (e) { delete _mem[key]; }
}

// Schema migration: run on every load, safe to call repeatedly
export function migrateTeamData(data, key) {
  if (!data || typeof data !== "object") { return data; }
  var version = data.schemaVersion || 0;
  // v0 -> v1: add schemaVersion field to all team sub-objects
  if (version < 1) {
    data = Object.assign({}, data, { schemaVersion: 1 });
    saveJSON(key, data);
  }
  return data;
}

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
      name:      p.name      || "",
      skills:    skills,
      tags:      p.tags      || [],
      dislikes:  p.dislikes  || [],
      prefs:     p.prefs     || [],
      batSkills: p.batSkills || []
    };
  });
}

export function migrateSchedule(schedule) {
  if (!Array.isArray(schedule)) { return schedule; }
  return schedule.map(function(g) {
    return {
      id:          g.id          || (Date.now() + Math.random() + ""),
      date:        g.date        || "",
      time:        g.time        || "",
      location:    g.location    || "",
      opponent:    g.opponent    || "",
      home:        g.home        || false,
      result:      g.result      || "",
      ourScore:    g.ourScore    || "",
      theirScore:  g.theirScore  || "",
      battingPerf: g.battingPerf || {}
    };
  });
}

export function migrateGrid(grid, roster, innings) {
  if (!grid || typeof grid !== "object") { return initGrid(roster, innings); }
  // Ensure all current roster players have rows, prune removed players
  var ng = {};
  var players = roster.map(function(r) { return r.name; });
  for (var pi = 0; pi < players.length; pi++) {
    var pname = players[pi];
    var existing = grid[pname] || [];
    var row = [];
    for (var i = 0; i < innings; i++) { row.push(existing[i] || ""); }
    ng[pname] = row;
  }
  return ng;
}


// ============================================================
// MUD HENS 2026 SEASON SCHEDULE
// ============================================================

var MUD_HENS_SCHEDULE = [
  { id:"g1",  date:"2026-03-17", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"X", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g2",  date:"2026-03-19", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g3",  date:"2026-03-26", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g4",  date:"2026-03-31", time:"7:30 PM",  location:"FP 4", opponent:"Bananas",          home:false, result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g5",  date:"2026-04-02", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g6",  date:"2026-04-15", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g7",  date:"2026-04-18", time:"1:00 PM",  location:"FP 2", opponent:"Blue Wahoos",     home:false, result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g8",  date:"2026-04-23", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",          home:true,  result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g9",  date:"2026-04-25", time:"11:30 AM", location:"FP 2", opponent:"Timber Rattlers", home:true,  result:"", ourScore:"", theirScore:"", battingPerf:{} },
  { id:"g10", date:"2026-05-04", time:"6:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"", ourScore:"", theirScore:"", battingPerf:{} }
];

// ============================================================