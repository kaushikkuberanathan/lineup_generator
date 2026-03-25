// v2.1
import { useState, useMemo, useCallback } from "react";
import { jsPDF } from "jspdf";
import { isSupabaseEnabled, dbSaveTeams, dbDeleteTeam,
         dbLoadTeams, dbLoadTeamData, dbSaveTeamData } from './supabase.js';
import mixpanel from 'mixpanel-browser';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { generateLineupV2 } from '@/utils/lineupEngineV2';

var MIXPANEL_TOKEN = "YOUR_MIXPANEL_TOKEN";
if (MIXPANEL_TOKEN !== "YOUR_MIXPANEL_TOKEN") {
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: true,
    persistence: "localStorage",
    ignore_dnt: false,
    opt_out_tracking_by_default: false
  });
}

function track(event, props) {
  try {
    if (MIXPANEL_TOKEN !== "YOUR_MIXPANEL_TOKEN") {
      mixpanel.track(event, props || {});
    }
    if (window.location.hostname === "localhost") {
      console.log("[analytics]", event, props || {});
    }
  } catch (e) {}
}

// ============================================================
// HELPERS
// ============================================================

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

// ============================================================
// CONSTANTS
// ============================================================

var COUNTY_SCHEDULE_URL = "https://forsythcounty.kaizendemos.app/schedule/2026-youth-baseball-and-softball-mmt6617n";

var ALL_POSITIONS    = ["P","C","1B","2B","3B","SS","LF","LC","RC","RF","Bench"];
var FIELD_POSITIONS  = ["P","C","1B","2B","3B","SS","LF","LC","RC","RF"];
var INFIELD          = ["P","C","1B","2B","3B","SS"];
var OUTFIELD         = ["LF","LC","RC","RF"];

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#2980b9",
  RC:"#8e44ad", RF:"#239b56", Bench:"#555555"
};

// Skill badges - fielding only
// ── FIELDING SKILLS (ability) ──────────────────────────────────────────────
// Each key must survive across saved rosters — do not rename existing keys.
// Adding new keys is safe; removing/renaming breaks saved data.
var SKILLS = {
  // Fielding Ability
  strongArm:      { label:"Strong Arm",       group:"Fielding",    color:"#27ae60", weights:{ P:18,SS:16,"3B":15,"2B":13,LC:12,RC:12,"1B":8,LF:7,RF:7,C:6 } },
  goodGlove:      { label:"Good Glove",       group:"Fielding",    color:"#27ae60", weights:{ SS:18,"2B":16,"3B":14,"1B":12,LC:10,RC:10,C:8,P:6,LF:5,RF:5 } },
  accurateThrower:{ label:"Accurate Throw",   group:"Fielding",    color:"#27ae60", weights:{ P:16,SS:14,"3B":13,"2B":11,LC:10,RC:10,"1B":6,LF:5,RF:5,C:8 } },
  quickRelease:   { label:"Quick Release",    group:"Fielding",    color:"#27ae60", weights:{ C:18,SS:14,"2B":13,"3B":10,P:12,"1B":7,LC:8,RC:8,LF:4,RF:4 } },
  naturalCatcher: { label:"Natural Catcher",  group:"Fielding",    color:"#7f8c8d", weights:{ C:22,"1B":10,"3B":6,SS:4,"2B":4,P:4,LF:2,LC:1,RC:1,RF:2 } },
  bigKid:         { label:"Big/Strong",       group:"Fielding",    color:"#7f8c8d", weights:{ "1B":20,C:14,"3B":12,LF:8,RF:8,"2B":5,SS:3,LC:4,RC:4,P:6 } },
  leftHanded:     { label:"Left Handed",      group:"Fielding",    color:"#7f8c8d", weights:{ "1B":22,LF:14,P:12,LC:10,RC:10,RF:10,"3B":2,"2B":1,SS:1,C:1 } },
  // Game IQ
  gameAware:      { label:"Knows Where to Throw", group:"Game IQ", color:"#27ae60", weights:{ P:20,SS:18,"2B":10,"3B":9,"1B":7,C:4,LC:3,RC:3,LF:1,RF:1 } },
  callsForBall:   { label:"Calls for Ball",   group:"Game IQ",     color:"#27ae60", weights:{ LC:18,RC:18,SS:14,"2B":12,"3B":10,P:10,C:6,"1B":4,LF:8,RF:8 } },
  backsUpPlays:   { label:"Backs Up Plays",   group:"Game IQ",     color:"#27ae60", weights:{ P:14,LC:13,RC:13,SS:12,"2B":10,"3B":8,"1B":6,C:4,LF:6,RF:6 } },
  // Effort and Behavior
  highEnergy:     { label:"High Energy",      group:"Effort",      color:"#27ae60", weights:{ P:14,SS:13,LC:13,RC:13,"2B":11,"3B":10,"1B":8,C:8,LF:5,RF:5 } },
  hustles:        { label:"Hustles Always",   group:"Effort",      color:"#27ae60", weights:{ LC:12,RC:12,SS:11,"2B":10,"3B":9,P:8,"1B":7,C:6,LF:7,RF:7 } },
  developing:     { label:"Developing",       group:"Effort",      color:"#d4a017", weights:{ LF:16,RF:16,C:14,LC:12,RC:12,"1B":6,"2B":3,"3B":3,SS:1,P:1 } },
  // Base Running
  fastRunner:     { label:"Fast Runner",      group:"Base Running",color:"#27ae60", weights:{ LC:20,RC:20,SS:16,"2B":14,LF:10,RF:10,P:8,"3B":7,"1B":5,C:2 } },
  smartOnBases:   { label:"Smart on Bases",   group:"Base Running",color:"#27ae60", weights:{ SS:12,LC:11,RC:11,"2B":10,"3B":8,P:8,"1B":6,LF:7,RF:7,C:4 } },
  // Legacy key preserved for backward compatibility with saved rosters
  needsRoutine:   { label:"Needs Routine (Legacy)", group:"Fielding", color:"#d4a017", weights:{ "1B":16,RF:14,LF:14,C:8,"3B":6,LC:6,RC:6,"2B":5,SS:3,P:2 } }
};

// ── COACH NOTES / BEHAVIOR TAGS ───────────────────────────────────────────
// Tags affect position scoring (mods) and bench selection (benchOnce).
// Grouped for display — group field used by the UI only.
var TAGS = {
  // Confidence
  confidentPlayer:      { label:"Confident",       group:"Confidence",   color:"#27ae60", mods:{ P:10,SS:7,C:9,"2B":3,"3B":4,"1B":2,LC:2,RC:2,LF:1,RF:1 } },
  fearfulOfBall:        { label:"Fearful of Ball",  group:"Confidence",   color:"#c8102e", mods:{ LF:10,RF:10,"1B":5,LC:-2,RC:-2,C:-14,P:-14,SS:-8,"2B":-6,"3B":-8 } },
  hesitates:            { label:"Hesitates",        group:"Confidence",   color:"#d4a017", mods:{ P:-10,SS:-8,C:-8,LC:-4,RC:-4,"2B":-4,"3B":-4,"1B":4,LF:6,RF:6 } },
  // Effort and Behavior (coach-observed)
  goodCoachability:     { label:"Coachable",        group:"Behavior",     color:"#27ae60", mods:{ P:4,SS:3,C:4,"2B":4,"3B":4,"1B":4,LC:3,RC:3,LF:3,RF:3 } },
  inconsistentAttention:{ label:"Needs Focus",      group:"Behavior",     color:"#d4a017", mods:{ RF:8,LF:8,"1B":5,P:-12,SS:-10,C:-8,LC:-4,RC:-4,"2B":-4,"3B":-4 } },
  // Physical / Throwing
  weakThrower:          { label:"Weak Thrower",     group:"Physical",     color:"#c8102e", mods:{ P:-16,SS:-12,"3B":-10,"2B":-6,"1B":5,LF:5,RF:5,LC:-2,RC:-2,C:-4 } },
  slowRunner:           { label:"Slow Runner",      group:"Physical",     color:"#d4a017", mods:{ "1B":8,C:5,LF:3,RF:3,LC:-8,RC:-8,SS:-5,"2B":-3,"3B":-2,P:-1 } },
  // Base Running coaching
  needsBaseCoaching:    { label:"Needs Base Coaching", group:"Base Running", color:"#d4a017", mods:{ SS:-2,"2B":-2,LC:-2,RC:-2,P:-2,"3B":-1,"1B":4,LF:3,RF:3,C:2 } },
  // Lineup control
  benchOnce:            { label:"Bench Once Only",  group:"Lineup",       color:"#f5c842", mods:{} },
  absent:               { label:"Out This Game",     group:"Lineup",       color:"#c8102e", mods:{} }
};

// Batting skills
var BAT_SKILLS = {
  contactHitter:  { label:"Contact",    color:"#2471a3", bonus:3 },
  powerHitter:    { label:"Power",      color:"#27ae60", bonus:4 },
  patientEye:     { label:"Patient",    color:"#27ae60", bonus:5 },
  fastBaseRunner: { label:"Fast",       color:"#27ae60", bonus:5 },
  clutch:         { label:"Clutch",     color:"#2471a3", bonus:2 },
  freeSwinger:    { label:"Free Swing", color:"#c8102e", bonus:-3 },
  slowBat:        { label:"Slow Bat",   color:"#d4a017", bonus:-2 },
  nervous:        { label:"Nervous",    color:"#d4a017", bonus:-2 }
};

var DISLIKE_PENALTY = -50;

// Default roster
var DEFAULT_ROSTER = [];

// ============================================================
// STORAGE - localStorage with in-memory fallback
// ============================================================

// Storage: localStorage with in-memory fallback
var _mem = {};
var SCHEMA_VERSION = 2;

var APP_VERSION = "1.2.1";

var VERSION_HISTORY = [
  {
    version: "1.2.1",
    date: "March 24, 2026",
    changes: [
      "Added Sharon Springs Athletics link to Links tab (sharonspringsathletics.org)"
    ]
  },
  {
    version: "1.2.0",
    date: "March 24, 2026",
    changes: [
      "Redesigned diamond view: SVG field with green background, outfield arc, dirt infield, and realistic position coordinates",
      "Position boxes: dual-zone design with dark header band per position group and player name area below",
      "Single-inning mode: large player name (14px bold), inning badge, bench player pill at bottom-right",
      "All-innings mode: compact first names per inning slot, taller boxes — no numbered prefixes",
      "Dynamic viewBox: 680×640 single-inning / 680×680 all-innings",
      "First-name display enforced in all views including bench strips, print tab, and share link",
      "About tab: onboarding guide expanded by default, reordered above app info",
      "Vercel Analytics + Mixpanel event tracking added",
      "Schedule tab: computed batting average replaces BB column; stats legend added"
    ]
  },
  {
    version: "1.1.0",
    date: "March 24, 2026",
    changes: [
      "Replaced CF with LC (Left Center) and RC (Right Center) in outfield",
      "Expanded field to 10 players — 1 bench slot per inning",
      "Schema v2 migration — auto-remaps saved CF assignments to LC",
      "Added first-time coach onboarding modal (5-step walkthrough)",
      "Added About tab with version history and onboarding guide",
      "Added Feedback tab with free-form feedback and bug reporting",
      "Fixed LC and RC position colors for visibility",
      "Moved product docs to docs/product/ in repository"
    ]
  },
  {
    version: "1.0.0",
    date: "March 24, 2026",
    changes: [
      "MVP launch — Lineup Generator live on Vercel",
      "11-constraint auto-assign engine with retry fallback",
      "10-player defensive grid (P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF)",
      "Manual cell overrides with issue detection and Auto-Fix All",
      "Batting order with stats-driven Suggest Order",
      "Season stats tracking (AB, H, R, RBI, AVG with color coding)",
      "Schedule management with AI photo and text import",
      "Game result logging with per-player batting stats",
      "View-only share link (URL-encoded snapshot)",
      "PDF export via bundled jsPDF",
      "Print tab with Defense / Batting / Both toggle",
      "Supabase cloud sync with localStorage offline fallback",
      "PWA — installable on iOS and Android, offline-capable",
      "Export / Import JSON backup",
      "UptimeRobot keep-warm ping on Render backend"
    ]
  }
];

function loadJSON(key, def) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) { return JSON.parse(raw); }
  } catch (e) {
    try { var mv = _mem[key]; if (mv) { return JSON.parse(mv); } } catch (e2) {}
  }
  return def;
}

function saveJSON(key, val) {
  var str = JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch (e) { _mem[key] = str; }
}

function removeJSON(key) {
  try { localStorage.removeItem(key); } catch (e) { delete _mem[key]; }
}

// Schema migration: run on every load, safe to call repeatedly
function migrateTeamData(data, key) {
  if (!data || typeof data !== "object") { return data; }
  var version = data.schemaVersion || 0;
  // v0 -> v1: add schemaVersion field to all team sub-objects
  if (version < 1) {
    data = Object.assign({}, data, { schemaVersion: 1 });
    saveJSON(key, data);
  }
  return data;
}

function migrateRoster(roster) {
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
      lastName:           p.lastName           ?? (p.name ? p.name.split(" ").slice(1).join(" ") : "")
    };
  });
}

function migrateSchedule(schedule) {
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

function migrateGrid(grid, roster, innings) {
  if (!grid || typeof grid !== "object") { return initGrid(roster, innings); }
  // Remap CF → LC for any grid data saved before the 10-player update
  for (var pname in grid) {
    var playerInnings = grid[pname];
    if (!Array.isArray(playerInnings)) continue;
    for (var idx = 0; idx < playerInnings.length; idx++) {
      if (playerInnings[idx] === "CF") {
        playerInnings[idx] = "LC";
      }
    }
  }
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
  { id:"g1",  date:"2026-03-17", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"X", ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g2",  date:"2026-03-19", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"W", ourScore:"14", theirScore:"11", battingPerf:{ "A Hwang":{ ab:5, h:4, r:2, rbi:1, bb:0 }, "J Hershiser":{ ab:5, h:4, r:2, rbi:2, bb:0 }, "E Hastings":{ ab:4, h:3, r:1, rbi:2, bb:0 }, "L Hamilton":{ ab:4, h:3, r:1, rbi:2, bb:0 }, "M Mabrey":{ ab:4, h:3, r:2, rbi:1, bb:0 }, "E Kaushik":{ ab:5, h:3, r:1, rbi:0, bb:0 }, "C Arias":{ ab:3, h:2, r:1, rbi:2, bb:0 }, "C MacPhaul":{ ab:4, h:2, r:1, rbi:1, bb:0 }, "L Noland":{ ab:4, h:2, r:1, rbi:1, bb:0 }, "R Verma":{ ab:5, h:2, r:1, rbi:1, bb:0 }, "B Bieber":{ ab:5, h:2, r:1, rbi:0, bb:0 } } },
  { id:"g3",  date:"2026-03-26", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g4",  date:"2026-03-31", time:"7:30 PM",  location:"FP 4", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g5",  date:"2026-04-02", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g6",  date:"2026-04-15", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g7",  date:"2026-04-18", time:"1:00 PM",  location:"FP 2", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g8",  date:"2026-04-23", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g9",  date:"2026-04-25", time:"11:30 AM", location:"FP 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g10", date:"2026-05-04", time:"6:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g11", date:"2026-05-06", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var BANANAS_8U_SCHEDULE = [
  { id:"ba-g1",  date:"2026-03-19", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g2",  date:"2026-03-26", time:"7:30 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g3",  date:"2026-03-31", time:"7:30 PM",  location:"FP 4", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g4",  date:"2026-04-02", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g5",  date:"2026-04-15", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g6",  date:"2026-04-18", time:"11:30 AM", location:"FP 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g7",  date:"2026-04-23", time:"7:00 PM",  location:"JV 3", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g8",  date:"2026-04-25", time:"10:00 AM", location:"FP 2", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g9",  date:"2026-05-04", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var BLUE_WAHOOS_8U_SCHEDULE = [
  { id:"bw-g1",  date:"2026-03-19", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g2",  date:"2026-03-26", time:"7:00 PM",  location:"JV 3", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g3",  date:"2026-03-31", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g4",  date:"2026-04-02", time:"7:00 PM",  location:"JV 3", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g5",  date:"2026-04-15", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g6",  date:"2026-04-18", time:"1:00 PM",  location:"FP 2", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g7",  date:"2026-04-23", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g8",  date:"2026-04-25", time:"1:00 PM",  location:"FP 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g9",  date:"2026-05-04", time:"6:00 PM",  location:"JV 3", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 3", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var FIREFIGHTERS_8U_SCHEDULE = [
  { id:"fi-g1",  date:"2026-03-19", time:"6:00 PM",  location:"JV 2", opponent:"Mud Hens",        home:false, result:"L", ourScore:"11", theirScore:"14", battingPerf:{} },
  { id:"fi-g2",  date:"2026-03-26", time:"7:30 PM",  location:"JV 2", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g3",  date:"2026-03-31", time:"6:00 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g4",  date:"2026-04-02", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g5",  date:"2026-04-15", time:"6:00 PM",  location:"JV 2", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g6",  date:"2026-04-18", time:"10:00 AM", location:"FP 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g7",  date:"2026-04-23", time:"6:00 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g8",  date:"2026-04-25", time:"10:00 AM", location:"FP 2", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g9",  date:"2026-05-04", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var PARTY_ANIMALS_8U_SCHEDULE = [
  { id:"pa-g1",  date:"2026-03-19", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"W", ourScore:"14", theirScore:"7",  battingPerf:{} },
  { id:"pa-g2",  date:"2026-03-26", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g3",  date:"2026-03-31", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g4",  date:"2026-04-02", time:"7:30 PM",  location:"JV 2", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g5",  date:"2026-04-15", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g6",  date:"2026-04-18", time:"11:30 AM", location:"FP 2", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g7",  date:"2026-04-23", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g8",  date:"2026-04-25", time:"1:00 PM",  location:"FP 2", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g9",  date:"2026-05-04", time:"7:30 PM",  location:"JV 2", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g10", date:"2026-05-06", time:"7:30 PM",  location:"JV 2", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var TIMBER_RATTLERS_8U_SCHEDULE = [
  { id:"ti-g1",  date:"2026-03-19", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"L", ourScore:"7",  theirScore:"14", battingPerf:{} },
  { id:"ti-g2",  date:"2026-03-26", time:"6:00 PM",  location:"JV 2", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g3",  date:"2026-03-31", time:"7:30 PM",  location:"JV 2", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g4",  date:"2026-04-02", time:"6:00 PM",  location:"JV 2", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g5",  date:"2026-04-15", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g6",  date:"2026-04-18", time:"10:00 AM", location:"FP 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g7",  date:"2026-04-23", time:"7:30 PM",  location:"JV 2", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g8",  date:"2026-04-25", time:"11:30 AM", location:"FP 2", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g9",  date:"2026-05-04", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 2", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

// ============================================================
// SCORING ENGINE
// ============================================================

function scorePosition(playerName, pos, inning, grid, roster) {
  var info = null;
  for (var ri = 0; ri < roster.length; ri++) {
    if (roster[ri].name === playerName) { info = roster[ri]; break; }
  }
  if (!info) { return 0; }

  // Layer 1 - outfield hard block
  if (OUTFIELD.indexOf(pos) >= 0) {
    var ofCount = 0;
    var pGrid = grid[playerName] || [];
    for (var gi = 0; gi < pGrid.length; gi++) {
      if (pGrid[gi] === pos) { ofCount++; }
    }
    if (ofCount > 0) { return -999; }
  }

  var score = 0;

  // Layer 2 - skill weights (averaged)
  var playerSkills = info.skills || [];
  if (playerSkills.length > 0) {
    var totalWeight = 0;
    for (var si = 0; si < playerSkills.length; si++) {
      var sk = SKILLS[playerSkills[si]];
      if (sk && sk.weights && sk.weights[pos] !== undefined) {
        totalWeight += sk.weights[pos];
      }
    }
    score += totalWeight / playerSkills.length;
  }

  // Layer 3 - preferred positions (ranked, graduated bonus)
  // 1st pref: +30, 2nd: +24, 3rd: +18, 4th: +12, 5th+: +8
  // Each rank still meaningfully higher than the next, never zero.
  var prefs = info.prefs || [];
  var prefBonuses = [30, 24, 18, 12, 8];
  for (var prefi = 0; prefi < prefs.length; prefi++) {
    if (prefs[prefi] === pos) {
      score += prefBonuses[prefi] !== undefined ? prefBonuses[prefi] : 8;
      break;
    }
  }

  // Layer 4 - coach tags
  var playerTags = info.tags || [];
  for (var ti = 0; ti < playerTags.length; ti++) {
    var tag = TAGS[playerTags[ti]];
    if (tag && tag.mods && tag.mods[pos] !== undefined) {
      score += tag.mods[pos];
    }
  }

  // Layer 5 - dislikes
  var dislikes = info.dislikes || [];
  if (dislikes.indexOf(pos) >= 0) { score += DISLIKE_PENALTY; }

  // Layer 6 - consecutive innings hard block (max 1 inning at same infield position in a row)
  var pGrid2 = grid[playerName] || [];
  if (INFIELD.indexOf(pos) >= 0 && inning >= 1) {
    if (pGrid2[inning - 1] === pos) {
      return -998; // hard block: already played this infield position last inning
    }
  }

  // Layer 7 - spread penalty (stronger: -10 per prior inning to prevent monopoly)
  var priorCount = 0;
  for (var pi = 0; pi < inning; pi++) {
    if (pGrid2[pi] === pos) { priorCount++; }
  }
  score -= priorCount * 10;

  // Layer 8 - bench equity bonus
  var benchCount = 0;
  for (var bi = 0; bi < inning; bi++) {
    if (pGrid2[bi] === "Bench") { benchCount++; }
  }
  score += benchCount * 4;

  return score;
}

function autoAssign(roster, innings) {
  var players = roster.map(function(r) { return r.name; });
  var n = players.length;
  var grid = {};
  for (var pi = 0; pi < players.length; pi++) {
    grid[players[pi]] = [];
    for (var ii = 0; ii < innings; ii++) { grid[players[pi]].push(""); }
  }

  var infieldOrder = ["P","SS","C","1B","2B","3B"];
  var ofOrder      = ["LC","RC","LF","RF"];

  function hasPlayedPos(pName, pos) {
    var pg = grid[pName] || [];
    for (var i = 0; i < pg.length; i++) { if (pg[i] === pos) { return true; } }
    return false;
  }

  function totalOFCount(pName) {
    var pg = grid[pName] || [];
    var cnt = 0;
    for (var i = 0; i < pg.length; i++) {
      if (OUTFIELD.indexOf(pg[i]) >= 0) { cnt++; }
    }
    return cnt;
  }

  function benchCount(pName, upToInning) {
    var pg = grid[pName] || [];
    var cnt = 0;
    for (var i = 0; i < upToInning; i++) { if (pg[i] === "Bench") { cnt++; } }
    return cnt;
  }

  // Identify absent players (tagged "absent") — they sit Out every inning
  var absentSet = {};
  for (var absi = 0; absi < roster.length; absi++) {
    if ((roster[absi].tags || []).indexOf("absent") >= 0) {
      absentSet[roster[absi].name] = true;
    }
  }
  var activePlayers = players.filter(function(p) { return !absentSet[p]; });
  var activeN = activePlayers.length;

  for (var inning = 0; inning < innings; inning++) {
    // Mark absent players Out for this inning
    for (var abni = 0; abni < players.length; abni++) {
      if (absentSet[players[abni]]) { grid[players[abni]][inning] = "Out"; }
    }

    // benchSlots = active players beyond 9
    var benchSlots = activeN - 10;
    if (benchSlots < 0) { benchSlots = 0; }

    // Players who were benched last inning must play this inning
    var mustPlay = [];
    if (inning > 0) {
      for (var mp = 0; mp < activePlayers.length; mp++) {
        if (grid[activePlayers[mp]][inning - 1] === "Bench") { mustPlay.push(activePlayers[mp]); }
      }
    }

    // Select bench players.
    // Players with the "benchOnce" tag may only be benched once per game.
    // They are excluded from candidacy after their first bench inning.
    // Fallback: if not enough non-protected candidates, allow protected players
    // to sit again (unavoidable with very small rosters).
    function hasBenchOnce(pName) {
      for (var ri = 0; ri < roster.length; ri++) {
        if (roster[ri].name === pName) {
          return (roster[ri].tags || []).indexOf("benchOnce") >= 0;
        }
      }
      return false;
    }
    var benchCandidates = [];
    for (var bp = 0; bp < activePlayers.length; bp++) {
      var pn = activePlayers[bp];
      if (mustPlay.indexOf(pn) >= 0) { continue; }
      var bc = benchCount(pn, inning);
      var protected_ = hasBenchOnce(pn);
      // Skip protected players who have already sat once
      if (protected_ && bc >= 1) { continue; }
      benchCandidates.push({ name: pn, bc: bc, protected_: protected_ });
    }
    // Sort: unprotected first (they take bench first), then by fewest bench innings
    benchCandidates.sort(function(a, b) {
      if (a.protected_ !== b.protected_) { return a.protected_ ? 1 : -1; }
      return a.bc - b.bc;
    });
    // Fallback: if still not enough candidates, include protected players who have sat
    if (benchCandidates.length < benchSlots) {
      var fallback = [];
      for (var fbp = 0; fbp < activePlayers.length; fbp++) {
        var fpn = activePlayers[fbp];
        if (mustPlay.indexOf(fpn) >= 0) { continue; }
        var alreadyIn = false;
        for (var fbi = 0; fbi < benchCandidates.length; fbi++) {
          if (benchCandidates[fbi].name === fpn) { alreadyIn = true; break; }
        }
        if (!alreadyIn) { fallback.push({ name: fpn, bc: benchCount(fpn, inning), protected_: true }); }
      }
      fallback.sort(function(a, b) { return a.bc - b.bc; });
      benchCandidates = benchCandidates.concat(fallback);
    }
    var benched = [];
    for (var bsi = 0; bsi < benchSlots; bsi++) {
      if (benchCandidates[bsi]) { benched.push(benchCandidates[bsi].name); }
    }
    for (var bni = 0; bni < benched.length; bni++) {
      grid[benched[bni]][inning] = "Bench";
    }

    var available = [];
    for (var ai = 0; ai < activePlayers.length; ai++) {
      if (benched.indexOf(activePlayers[ai]) < 0) { available.push(activePlayers[ai]); }
    }

    // Fill outfield FIRST using rotation to prevent repeats
    // Priority: hasn't played this OF position > fewest total OF appearances > bench equity
    for (var ofi = 0; ofi < ofOrder.length; ofi++) {
      var ofPos = ofOrder[ofi];
      if (available.length === 0) { break; }
      var ofRanked = [];
      for (var ori = 0; ori < available.length; ori++) {
        var pName = available[ori];
        var alreadyPlayed = hasPlayedPos(pName, ofPos) ? 1 : 0;
        var totalOF = totalOFCount(pName);
        var bc = benchCount(pName, inning);
        ofRanked.push({ name: pName, score: -alreadyPlayed * 1000 - totalOF * 10 + bc });
      }
      ofRanked.sort(function(a, b) { return b.score - a.score; });
      var ofWinner = ofRanked[0].name;
      grid[ofWinner][inning] = ofPos;
      var owIdx = available.indexOf(ofWinner);
      if (owIdx >= 0) { available.splice(owIdx, 1); }
    }

    // Fill infield using skill-based scoring
    // Sort infield positions by most-constrained-first:
    // positions with fewest non-blocked candidates get filled before
    // positions with many options, preventing last-position deadlocks.
    var ifPositionsToFill = infieldOrder.slice();
    while (ifPositionsToFill.length > 0 && available.length > 0) {
      // Score each remaining position by number of valid (non-blocked) candidates
      var ifConstraint = [];
      for (var ifci = 0; ifci < ifPositionsToFill.length; ifci++) {
        var ifc = ifPositionsToFill[ifci];
        var validCount = 0;
        for (var ifvi = 0; ifvi < available.length; ifvi++) {
          if (scorePosition(available[ifvi], ifc, inning, grid, roster) > -998) { validCount++; }
        }
        ifConstraint.push({ pos: ifc, validCount: validCount });
      }
      // Fill most constrained position first (fewest valid candidates)
      ifConstraint.sort(function(a, b) { return a.validCount - b.validCount; });
      var ifPos = ifConstraint[0].pos;
      ifPositionsToFill.splice(ifPositionsToFill.indexOf(ifPos), 1);
      var ifRanked = [];
      for (var ifri = 0; ifri < available.length; ifri++) {
        ifRanked.push({ name: available[ifri], score: scorePosition(available[ifri], ifPos, inning, grid, roster) });
      }
      ifRanked.sort(function(a, b) { return b.score - a.score; });
      // If all candidates are blocked, pick the one who played this position least recently
      if (ifRanked[0].score <= -998) {
        ifRanked.sort(function(a, b) {
          var pgA = grid[a.name] || []; var pgB = grid[b.name] || [];
          var lastA = -1; var lastB = -1;
          for (var li = inning - 1; li >= 0; li--) {
            if (pgA[li] === ifPos && lastA < 0) { lastA = li; }
            if (pgB[li] === ifPos && lastB < 0) { lastB = li; }
          }
          return lastA - lastB;
        });
      }
      var ifWinner = ifRanked[0].name;
      grid[ifWinner][inning] = ifPos;
      var iwIdx = available.indexOf(ifWinner);
      if (iwIdx >= 0) { available.splice(iwIdx, 1); }
    }

    // Any remaining overflow players go to Bench
    for (var ovi = 0; ovi < available.length; ovi++) {
      grid[available[ovi]][inning] = "Bench";
    }
  }

  return grid;
}


// ─────────────────────────────────────────────────────────────────
// autoAssign        — primary heuristic (most-constrained-first)
// autoAssignWithRetryFallback — production entry point with observability
//
// Output contract:
//   grid        {Record<playerName, string[]>}  — complete defensive grid
//   warnings    {Warning[]}                     — remaining constraint violations ([] = clean)
//   attempts    {number}                        — how many runs were needed (1 = clean first try)
//   usedFallback {boolean}                      — true if retry loop fired
//   isValid     {boolean}                       — true iff warnings.length === 0
//   explain     {string}                        — human-readable status for debugging
// ─────────────────────────────────────────────────────────────────
function autoAssignWithRetryFallback(roster, innings) {
  var startTime = Date.now();

  // Attempt 1: primary heuristic on original roster order
  var grid = autoAssign(roster, innings);
  var warnings = validateGrid(grid, roster, innings);

  if (warnings.length === 0) {
    return {
      grid:        grid,
      warnings:    [],
      attempts:    1,
      usedFallback: false,
      isValid:     true,
      explain:     "Clean on first attempt (" + (Date.now() - startTime) + "ms)"
    };
  }

  // Attempts 2–8: shuffle roster order to escape local minima
  var best = grid;
  var bestWarnings = warnings;
  var shuffled = roster.slice();
  var attempt = 1;

  for (; attempt < 8; attempt++) {
    // Fisher-Yates shuffle
    for (var si = shuffled.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = shuffled[si]; shuffled[si] = shuffled[sj]; shuffled[sj] = tmp;
    }
    var ng = autoAssign(shuffled, innings);
    var nw = validateGrid(ng, roster, innings);
    if (nw.length < bestWarnings.length) { best = ng; bestWarnings = nw; }
    if (bestWarnings.length === 0) { break; }
  }

  var elapsed = Date.now() - startTime;
  var isValid = bestWarnings.length === 0;
  var explain = isValid
    ? "Clean after " + (attempt + 1) + " attempts (" + elapsed + "ms)"
    : "Best result after " + (attempt + 1) + " attempts has " + bestWarnings.length
      + " warning(s): " + bestWarnings.map(function(w) { return w.msg; }).join("; ")
      + " (" + elapsed + "ms)";

  return {
    grid:        best,
    warnings:    bestWarnings,
    attempts:    attempt + 1,
    usedFallback: true,
    isValid:     isValid,
    explain:     explain
  };
}

// Backward-compatible alias so any direct autoAssignWithFallback calls still work
var autoAssignWithFallback = autoAssignWithRetryFallback;

function validateGrid(grid, roster, innings) {
  var warnings = [];
  var players = roster.map(function(r) { return r.name; });

  for (var i = 0; i < innings; i++) {
    var assigned = {};
    var benchCount = 0;
    for (var pi = 0; pi < players.length; pi++) {
      var p = players[pi];
      var pos = grid[p] ? grid[p][i] : "";
      if (!pos) {
        warnings.push({ type:"missing", msg: p + " unassigned in inning " + (i + 1) });
        continue;
      }
      if (pos === "Bench") {
        benchCount++;
        if (i > 0 && grid[p][i - 1] === "Bench") {
          warnings.push({ type:"backtoback", msg: p + " benched back-to-back innings " + i + " and " + (i + 1) });
        }
      } else {
        if (assigned[pos]) {
          warnings.push({ type:"conflict", msg: "Both " + assigned[pos] + " and " + p + " at " + pos + " inning " + (i + 1) });
        }
        assigned[pos] = p;
      }
    }
    if (benchCount > 2) {
      warnings.push({ type:"bench", msg: "Inning " + (i + 1) + ": " + benchCount + " players benched (max 2)" });
    }
  }

  // Outfield repeats
  for (var opi = 0; opi < players.length; opi++) {
    var p2 = players[opi];
    var pGrid = grid[p2] || [];
    for (var ofi = 0; ofi < OUTFIELD.length; ofi++) {
      var ofPos = OUTFIELD[ofi];
      var count = 0;
      for (var gi = 0; gi < pGrid.length; gi++) { if (pGrid[gi] === ofPos) { count++; } }
      if (count > 1) {
        warnings.push({ type:"outfield", msg: p2 + " plays " + ofPos + " " + count + " times" });
      }
    }
  }

  return warnings;
}

function initGrid(roster, innings) {
  var grid = {};
  for (var i = 0; i < roster.length; i++) {
    grid[roster[i].name] = [];
    for (var j = 0; j < innings; j++) { grid[roster[i].name].push(""); }
  }
  return grid;
}


// ============================================================
// STYLES
// ============================================================

var C = {
  navy: "#0f1f3d", navyLight: "#1a3260", red: "#c8102e", redDark: "#9b0c22",
  gold: "#f5c842", cream: "#fdf6ec", white: "#ffffff", text: "#1a1a2e",
  textMuted: "#6a7a9a", border: "rgba(15,31,61,0.1)", cardBg: "#ffffff",
  // Field/game colors
  win: "#27ae60", loss: "#c8102e", tie: "#d4a017", canceled: "#7f8c8d",
  // Common UI values referenced inline throughout
  overlayBg: "rgba(0,0,0,0.5)", subtleBg: "rgba(15,31,61,0.06)",
  subtleBorder: "rgba(15,31,61,0.08)", subtleText: "rgba(15,31,61,0.3)"
};

function ss(obj) { return obj; }

var S = {
  app: { minHeight:"100vh", background:C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text },
  header: {
    background:"linear-gradient(135deg,#0f1f3d 0%,#1a3260 100%)",
    borderBottom:"4px solid " + C.red,
    padding:"12px 20px", display:"flex", alignItems:"center",
    justifyContent:"space-between", gap:"12px", flexWrap:"wrap"
  },
  logoWrap: { display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" },
  logoCircle: {
    width:"42px", height:"42px", borderRadius:"50%",
    background:C.red, border:"2.5px solid " + C.gold,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:"18px", fontWeight:"bold", color:C.gold, fontFamily:"Georgia,serif", flexShrink:0
  },
  logoTitle: { fontSize:"18px", fontWeight:"bold", color:C.gold, letterSpacing:"0.04em" },
  logoSub: { fontSize:"10px", color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em" },
  tabs: { display:"flex", gap:"2px", flexWrap:"wrap" },
  tab: function(active) {
    return {
      padding:"7px 14px", borderRadius:"6px", border:"none", cursor:"pointer",
      fontSize:"11px", fontWeight:"bold", fontFamily:"Georgia,serif",
      letterSpacing:"0.06em", textTransform:"uppercase", transition:"all 0.12s",
      background: active ? C.red : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.55)"
    };
  },
  body: { padding:"20px 24px", maxWidth:"1400px", margin:"0 auto" },
  card: {
    background:C.white, borderRadius:"10px", padding:"16px 18px",
    boxShadow:"0 2px 8px rgba(15,31,61,0.06)", marginBottom:"14px",
    border:"1px solid " + C.border
  },
  sectionTitle: {
    fontSize:"11px", letterSpacing:"0.18em", textTransform:"uppercase",
    color:C.red, fontWeight:"bold", marginBottom:"14px"
  },
  btn: function(v) {
    var bg = "rgba(15,31,61,0.08)";
    var col = C.text;
    var bdr = "none";
    var shadow = "none";
    if (v === "primary") { bg = "linear-gradient(135deg,"+C.red+","+C.redDark+")"; col="#fff"; shadow="0 2px 8px rgba(200,16,46,0.3)"; }
    else if (v === "gold")  { bg = "linear-gradient(135deg,#c8902e,#a07010)"; col="#fff"; }
    else if (v === "ghost") { bg = "transparent"; col = C.textMuted; bdr = "1px solid " + C.border; }
    else if (v === "danger"){ bg = C.red; col = "#fff"; }
    return {
      padding:"8px 16px", borderRadius:"6px", border:bdr, cursor:"pointer",
      fontSize:"11px", letterSpacing:"0.08em", textTransform:"uppercase",
      fontWeight:"bold", fontFamily:"Georgia,serif", transition:"all 0.12s",
      background:bg, color:col, boxShadow:shadow
    };
  },
  posTag: function(pos) {
    return {
      display:"inline-block", padding:"2px 6px", borderRadius:"4px",
      fontSize:"10px", fontWeight:"bold", margin:"1px",
      background:(POS_COLORS[pos] || "#0f1f3d") + "cc", color:"#fff"
    };
  },
  input: {
    background:"#f8f4ee", border:"1.5px solid rgba(15,31,61,0.15)",
    borderRadius:"6px", padding:"7px 10px", color:C.text,
    fontFamily:"Georgia,serif", fontSize:"12px", outline:"none",
    width:"100%", boxSizing:"border-box"
  },
  badge: function(color, active) {
    return {
      display:"inline-flex", alignItems:"center", gap:"5px",
      padding:"3px 9px 3px 7px", borderRadius:"6px", cursor:"pointer",
      fontSize:"10px", fontWeight: active ? "bold" : "500",
      margin:"2px", transition:"all 0.12s",
      background: active ? color + "18" : "rgba(15,31,61,0.04)",
      color: active ? color : "#6b7280",
      border: "1px solid " + (active ? color + "55" : "rgba(15,31,61,0.1)"),
      borderLeft: "3px solid " + (active ? color : "rgba(15,31,61,0.12)")
    };
  }
};



// ============================================================
// MAIN COMPONENT
// ============================================================

export default function App() {

  var _syncStatus = useState("idle");
  var syncStatus = _syncStatus[0]; var setSyncStatus = _syncStatus[1];

  function dbSync(fn) {
    window._lastLocalWrite = Date.now();
    setSyncStatus("syncing");
    fn().then(function() {
      setSyncStatus("synced");
      setTimeout(function() { setSyncStatus("idle"); }, 2000);
    }).catch(function(e) {
      setSyncStatus("error");
      console.warn("[DB] sync error:", e);
    });
  }

  // --- Team / App level state ---
  var initTeams    = loadJSON("app:teams", null) || [];
  var initActiveId = loadJSON("ui:activeTeam", null);
  var initRoster   = initActiveId ? migrateRoster(loadJSON("team:" + initActiveId + ":roster", [])) : [];
  var initSchedule = initActiveId ? migrateSchedule(loadJSON("team:" + initActiveId + ":schedule", [])) : [];
  var initPractice = initActiveId ? loadJSON("team:" + initActiveId + ":practices", []) : [];
  var initInnings  = initActiveId ? (loadJSON("team:" + initActiveId + ":innings", 6) || 6) : 6;
  var initGrid_    = initActiveId ? migrateGrid(loadJSON("team:" + initActiveId + ":grid", null), initRoster, initInnings) : null;

  if (!window._lineupDbBooted && isSupabaseEnabled) {
    window._lineupDbBooted = true;
    dbLoadTeams().then(function(dbTeams) {
      var localTeams = loadJSON("app:teams", []) || [];
      var merged = dbTeams ? dbTeams.slice() : [];
      for (var li = 0; li < localTeams.length; li++) {
        var found = false;
        for (var di = 0; di < merged.length; di++) {
          if (merged[di].id === localTeams[li].id) { found = true; break; }
        }
        if (!found) { merged.push(localTeams[li]); }
      }
      if (merged.length > 0) {
        saveJSON("app:teams", merged);
        setTeams(merged);
      }

      // If a team was already active (e.g. returning user on fresh browser),
      // hydrate its roster from Supabase so the home screen shows the correct
      // player count without requiring the user to tap into the team first.
      var bootActiveId = loadJSON("ui:activeTeam", null);
      if (bootActiveId) {
        dbLoadTeamData(bootActiveId).then(function(dbData) {
          if (!dbData || !dbData.roster || dbData.roster.length === 0) { return; }
          saveJSON("team:" + bootActiveId + ":roster", dbData.roster);
          setRoster(migrateRoster(dbData.roster));
        }).catch(function(err) {
          console.error("[boot] failed to hydrate active team roster:", err);
        });
      }

      // MIGRATION: seed division teams that do not yet exist in DB
      // Each team gets a migration version stamp. If the stamp matches
      // the current version, skip — do not overwrite coach edits.
      // Coaches can freely edit schedules via the Schedule tab after seeding.
      var MIGRATION_VERSION = "2026-official-v6";
      var existingIds = merged.map(function(t) { return t.id; });

      var migrationTargets = [
        { id:"bananas-8u",         name:"Bananas",         ageGroup:"8U", year:2026, schedule:BANANAS_8U_SCHEDULE         },
        { id:"blue-wahoos-8u",     name:"Blue Wahoos",     ageGroup:"8U", year:2026, schedule:BLUE_WAHOOS_8U_SCHEDULE     },
        { id:"firefighters-8u",    name:"Firefighters",    ageGroup:"8U", year:2026, schedule:FIREFIGHTERS_8U_SCHEDULE    },
        { id:"party-animals-8u",   name:"Party Animals",   ageGroup:"8U", year:2026, schedule:PARTY_ANIMALS_8U_SCHEDULE   },
        { id:"timber-rattlers-8u", name:"Timber Rattlers", ageGroup:"8U", year:2026, schedule:TIMBER_RATTLERS_8U_SCHEDULE }
      ];

      var toCreate = [];
      for (var mi = 0; mi < migrationTargets.length; mi++) {
        var mt = migrationTargets[mi];
        var migKey = "migration:" + mt.id + ":version";
        var alreadyMigrated = loadJSON(migKey, null);
        if (alreadyMigrated === MIGRATION_VERSION) { continue; } // already done
        if (existingIds.indexOf(mt.id) >= 0) {
          if (alreadyMigrated !== MIGRATION_VERSION) {
            (function(captured) {
              dbLoadTeamData(captured.id).then(function(existing) {
                dbSaveTeamData(captured.id, {
                  roster:       existing && existing.roster        ? existing.roster        : [],
                  schedule:     (function() {
                    var exGames = existing && existing.schedule ? existing.schedule : [];
                    var exById = {};
                    for (var ei = 0; ei < exGames.length; ei++) {
                      if (exGames[ei].id) { exById[exGames[ei].id] = exGames[ei]; }
                    }
                    return captured.schedule.map(function(g) {
                      var prev = exById[g.id];
                      if (!prev) { return g; }
                      return {
                        id: g.id, date: g.date, time: g.time,
                        location: g.location, opponent: g.opponent, home: g.home,
                        result:      prev.result      || g.result,
                        ourScore:    prev.ourScore    || g.ourScore,
                        theirScore:  prev.theirScore  || g.theirScore,
                        battingPerf: prev.battingPerf && Object.keys(prev.battingPerf).length > 0
                                     ? prev.battingPerf : (g.battingPerf || {})
                      };
                    });
                  })(),
                  practices:    existing && existing.practices     ? existing.practices     : [],
                  battingOrder: existing && existing.battingOrder  ? existing.battingOrder  : [],
                  grid:         existing && existing.grid          ? existing.grid          : {},
                  innings:      existing && existing.innings       ? existing.innings       : 6,
                  locked:       existing                           ? existing.locked        : false
                });
                saveJSON("team:" + captured.id + ":schedule", captured.schedule);
                saveJSON("migration:" + captured.id + ":version", MIGRATION_VERSION);
              }).catch(function() {
                saveJSON("migration:" + captured.id + ":version", MIGRATION_VERSION);
              });
            })(mt);
          } else {
            saveJSON(migKey, MIGRATION_VERSION);
          }
          continue;
        }
        toCreate.push(mt);
      }

      if (toCreate.length > 0) {
        // Add new teams to the local list immediately
        var withNew = merged.concat(toCreate.map(function(t) {
          return { id:t.id, name:t.name, ageGroup:t.ageGroup, year:t.year };
        }));
        saveJSON("app:teams", withNew);
        setTeams(withNew);

        // Persist each team to Supabase and localStorage
        for (var ci = 0; ci < toCreate.length; ci++) {
          var ct = toCreate[ci];
          var migKey2 = "migration:" + ct.id + ":version";
          // Save team record
          dbSaveTeams([{ id:ct.id, name:ct.name, ageGroup:ct.ageGroup, year:ct.year }]);
          // Save team data with official schedule, empty roster
          dbSaveTeamData(ct.id, {
            roster: [], schedule: ct.schedule, practices: [],
            battingOrder: [], grid: {}, innings: 6, locked: false
          });
          // Seed localStorage for offline access
          saveJSON("team:" + ct.id + ":schedule", ct.schedule);
          saveJSON("team:" + ct.id + ":roster", []);
          // Stamp migration version so this never runs again for this team
          saveJSON(migKey2, MIGRATION_VERSION);
        }
      }
      // One-time patch: find Mud Hens by name and push official
      // schedule to whatever ID it was actually created with.
      // This handles the case where the team was created via UI
      // with a timestamp ID instead of the hardcoded "mudhens-8u".
      var MH_PATCH_KEY = "migration:mudhens:schedule-patch-v5";
      if (loadJSON(MH_PATCH_KEY, null) !== "done") {
        var mhTeam = null;
        for (var mhi = 0; mhi < merged.length; mhi++) {
          if (merged[mhi].name === "Mud Hens") { mhTeam = merged[mhi]; break; }
        }
        if (mhTeam) {
          (function(capturedTeam) {
            dbLoadTeamData(capturedTeam.id).then(function(existing) {
              var existingGames = existing && existing.schedule ? existing.schedule : [];
              var existingById = {};
              for (var ei = 0; ei < existingGames.length; ei++) {
                existingById[existingGames[ei].id] = existingGames[ei];
              }
              var mergedSchedule = MUD_HENS_SCHEDULE.map(function(og) {
                var prev = existingById[og.id];
                if (!prev) return og;
                return Object.assign({}, og, {
                  result:      prev.result      !== undefined ? prev.result      : og.result,
                  ourScore:    prev.ourScore     !== undefined ? prev.ourScore    : og.ourScore,
                  theirScore:  prev.theirScore   !== undefined ? prev.theirScore  : og.theirScore,
                  battingPerf: prev.battingPerf  && prev.battingPerf.length > 0 ? prev.battingPerf : og.battingPerf
                });
              });
              dbSaveTeamData(capturedTeam.id, {
                roster:       existing && existing.roster       ? existing.roster       : [],
                schedule:     mergedSchedule,
                practices:    existing && existing.practices    ? existing.practices    : [],
                battingOrder: existing && existing.battingOrder ? existing.battingOrder : [],
                grid:         existing && existing.grid         ? existing.grid         : {},
                innings:      existing && existing.innings      ? existing.innings      : 6,
                locked:       existing                          ? existing.locked       : false
              });
              saveJSON("team:" + capturedTeam.id + ":schedule", mergedSchedule);
              saveJSON(MH_PATCH_KEY, "done");
            }).catch(function() {});
          })(mhTeam);
        }
      }
    }).catch(function() {});
  }

  var _sc = useState("home");  // Always land on home — greeting + team picker
  var screen = _sc[0]; var setScreen = _sc[1];
  var _teams = useState(initTeams);
  var teams = _teams[0]; var setTeams = _teams[1];
  var _atid = useState(initActiveId);
  var activeTeamId = _atid[0]; var setActiveTeamId = _atid[1];
  var _tab = useState("roster");
  var tab = _tab[0]; var setTab = _tab[1];
  var _ros = useState(initRoster);
  var roster = _ros[0]; var setRoster = _ros[1];
  var _rosterHistory = useState([]);
  var rosterHistory = _rosterHistory[0]; var setRosterHistory = _rosterHistory[1];
  var _inn = useState(initInnings);
  var innings = _inn[0]; var setInnings = _inn[1];
  var _grd = useState(function() { return initGrid_ || initGrid(initRoster, initInnings); });
  var grid = _grd[0]; var setGrid = _grd[1];
  var _bat = useState(initRoster.map(function(r) { return r.name; }));
  var battingOrder = _bat[0]; var setBattingOrder = _bat[1];
  var _sched = useState(initSchedule);
  var schedule = _sched[0]; var setSchedule = _sched[1];
  var _prac = useState(initPractice);
  var practices = _prac[0]; var setPractices = _prac[1];
  var _dirty = useState(false);
  var lineupDirty = _dirty[0]; var setLineupDirty = _dirty[1];
  var _lastAutoGrid = useState(null);
  var lastAutoGrid = _lastAutoGrid[0]; var setLastAutoGrid = _lastAutoGrid[1];
  var _locked = useState(function() {
    var tid = loadJSON("ui:activeTeam", null);
    return tid ? (loadJSON("team:" + tid + ":locked", false) || false) : false;
  });
  var lineupLocked = _locked[0]; var setLineupLocked = _locked[1];
  var _nfn = useState(""); var newFirstName = _nfn[0]; var setNewFirstName = _nfn[1];
  var _nln = useState(""); var newLastName  = _nln[0]; var setNewLastName  = _nln[1];
  var _drag = useState(null);
  var dragPlayer = _drag[0]; var setDragPlayer = _drag[1];
  // Touch drag uses a mutable ref (window object) instead of useState to avoid
  // stale closure issues in onTouchMove handlers. useState captures the value
  // at render time; a ref always gives the current value.
  if (!window._bTouchDrag) { window._bTouchDrag = { active:false, name:null, startY:0, currentIdx:null }; }
  var _touchDragRe = useState(0); // integer version counter — increment to force re-render
  var touchDragVer = _touchDragRe[0]; var bumpTouchDrag = _touchDragRe[1];
  var touchDrag = window._bTouchDrag;
  function setTouchDrag(val) {
    window._bTouchDrag = val;
    bumpTouchDrag(function(v) { return v + 1; });
  }
  var _inlineScore = useState(null);
  var inlineScoreGame = _inlineScore[0]; var setInlineScoreGame = _inlineScore[1];
  var _col = useState({});
  var collapsed = _col[0]; var setCollapsed = _col[1];
  var _v2sec = useState({});
  var v2SectionOpen = _v2sec[0]; var setV2SectionOpen = _v2sec[1];
  var _sum = useState(false);
  var showSummary = _sum[0]; var setShowSummary = _sum[1];
  var _hm = useState("welcome");
  var homeMode = _hm[0]; var setHomeMode = _hm[1];
  var _nt = useState({ name:"", ageGroup:"", year: new Date().getFullYear() });
  var newTeam = _nt[0]; var setNewTeam = _nt[1];
  var _share = useState(false);
  var showShare = _share[0]; var setShowShare = _share[1];
  var _sg = useState(null);
  var shareGame = _sg[0]; var setShareGame = _sg[1];
  var _import = useState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] });
  var importState = _import[0]; var setImportState = _import[1];
  var _printOpt = useState("both");
  var printOpt = _printOpt[0]; var setPrintOpt = _printOpt[1];
  var _printDefView = useState("grid");
  var printDefView = _printDefView[0]; var setPrintDefView = _printDefView[1];
  var _printDiamondInning = useState(null);
  var printDiamondInning = _printDiamondInning[0]; var setPrintDiamondInning = _printDiamondInning[1];
  var _pdfLoading = useState(false);
  var pdfLoading = _pdfLoading[0]; var setPdfLoading = _pdfLoading[1];
  var _pdfSharing = useState(false);
  var pdfSharing = _pdfSharing[0]; var setPdfSharing = _pdfSharing[1];

  // Orientation detection — drives layout mode
  var _landscape = useState(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(orientation: landscape)").matches
      : false
  );
  var isLandscape = _landscape[0]; var setIsLandscape = _landscape[1];

  // Set up orientation listener once using a module-level guard (avoids useEffect dependency)
  if (typeof window !== "undefined" && window.matchMedia && !window._lineupOrientSet) {
    window._lineupOrientSet = true;
    var _mql = window.matchMedia("(orientation: landscape)");
    var _orientFn = function(e) { setIsLandscape(e.matches); };
    if (_mql.addEventListener) { _mql.addEventListener("change", _orientFn); }
    else if (_mql.addListener) { _mql.addListener(_orientFn); }
  }
  var _printNotes = useState("");
  var printNotes = _printNotes[0]; var setPrintNotes = _printNotes[1];
  var _newGame = useState({ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:{} });
  var newGame = _newGame[0]; var setNewGame = _newGame[1];
  var _editGame = useState(null);
  var editingGame = _editGame[0]; var setEditingGame = _editGame[1];
  var _showGame = useState(false);
  var showGameForm = _showGame[0]; var setShowGameForm = _showGame[1];
  var _importMode = useState(null);
  var importMode = _importMode[0]; var setImportMode = _importMode[1];
  var _resultImport = useState({ gameId:null, loading:false, error:"" });
  var resultImport = _resultImport[0]; var setResultImport = _resultImport[1];
  var _gridView = useState("player");
  var gridView = _gridView[0]; var setGridView = _gridView[1];
  var _diamondInning = useState(null);
  var diamondInning = _diamondInning[0]; var setDiamondInning = _diamondInning[1];
  var _showDiamond = useState(false);
  var showDiamond = _showDiamond[0]; var setShowDiamond = _showDiamond[1];
  var _newPrac = useState({ date:"", duration:"", focus:"Mixed", attendance:{}, drills:[], notes:"" });
  var newPrac = _newPrac[0]; var setNewPrac = _newPrac[1];
  var _showPrac = useState(false);
  var showPracForm = _showPrac[0]; var setShowPracForm = _showPrac[1];
  var _editPrac = useState(null);
  var editingPrac = _editPrac[0]; var setEditingPrac = _editPrac[1];

  var _fbCategory = useState("General");
  var fbCategory = _fbCategory[0]; var setFbCategory = _fbCategory[1];
  var _fbBody = useState("");
  var fbBody = _fbBody[0]; var setFbBody = _fbBody[1];
  var _fbChangeTypes = useState([]);
  var fbChangeTypes = _fbChangeTypes[0]; var setFbChangeTypes = _fbChangeTypes[1];
  var _fbConfirm = useState("");
  var fbConfirm = _fbConfirm[0]; var setFbConfirm = _fbConfirm[1];
  var _bugLocation = useState("");
  var bugLocation = _bugLocation[0]; var setBugLocation = _bugLocation[1];
  var _bugBody = useState("");
  var bugBody = _bugBody[0]; var setBugBody = _bugBody[1];
  var _bugSeverity = useState("");
  var bugSeverity = _bugSeverity[0]; var setBugSeverity = _bugSeverity[1];
  var _bugConfirm = useState("");
  var bugConfirm = _bugConfirm[0]; var setBugConfirm = _bugConfirm[1];
  var _fbHistoryOpen = useState(false);
  var fbHistoryOpen = _fbHistoryOpen[0]; var setFbHistoryOpen = _fbHistoryOpen[1];
  var _showOnboarding = useState(false);
  var showOnboarding = _showOnboarding[0]; var setShowOnboarding = _showOnboarding[1];
  var _aboutGuideOpen = useState(true);
  var aboutGuideOpen = _aboutGuideOpen[0]; var setAboutGuideOpen = _aboutGuideOpen[1];

  var warnings = useMemo(function() { return validateGrid(grid, roster, innings); }, [grid, roster, innings]);
  var errorCount = warnings.length;
  var players = roster.map(function(r) { return r.name; });

  var activeTeam = null;
  for (var _ti = 0; _ti < teams.length; _ti++) {
    if (teams[_ti].id === activeTeamId) { activeTeam = teams[_ti]; break; }
  }

  // --- Persistence helpers ---
  function persistRoster(next) {
    window._lastLocalWrite = Date.now();
    setRosterHistory(function(hist) {
      var h = hist.slice(-19); h.push(roster); return h;
    });
    setRoster(next);
    setLineupDirty(true);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":roster", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: next, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function undoRoster() {
    window._lastLocalWrite = Date.now();
    setRosterHistory(function(hist) {
      if (hist.length === 0) { return hist; }
      var prev = hist[hist.length - 1];
      var next = hist.slice(0, -1);
      setRoster(prev);
      setLineupDirty(true);
      if (activeTeamId) {
        saveJSON("team:" + activeTeamId + ":roster", prev);
        dbSync(function() { return dbSaveTeamData(activeTeamId, {
          roster: prev, schedule: schedule, practices: practices,
          battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
        }); });
      }
      return next;
    });
  }

  function persistSchedule(next) {
    window._lastLocalWrite = Date.now();
    setSchedule(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":schedule", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: next, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function persistPractices(next) {
    window._lastLocalWrite = Date.now();
    setPractices(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":practices", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: next,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function persistBatting(next) {
    window._lastLocalWrite = Date.now();
    setBattingOrder(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":batting", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: next, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function persistGrid(next) {
    window._lastLocalWrite = Date.now();
    setGrid(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":grid", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: next, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function persistInnings(n) {
    window._lastLocalWrite = Date.now();
    setInnings(n);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":innings", n);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: n, locked: lineupLocked
      }); });
    }
  }

  function persistLineupLocked(val) {
    window._lastLocalWrite = Date.now();
    setLineupLocked(val);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":locked", val);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: val
      }); });
    }
    if (val) {
      track("finalize_lineup", { roster_size: roster.length, innings: innings });
    }
  }

  function shareCurrentLineup() {
    track("share_link", {});
    var payload = {
      team:    activeTeam ? activeTeam.name + (activeTeam.ageGroup ? " " + activeTeam.ageGroup : "") : "Lineup",
      game:    null,
      grid:    grid,
      batting: battingOrder,
      roster:  roster.map(function(r) { return r.name; })
    };
    var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    var url = window.location.href.split("?")[0] + "?share=" + encoded;
    if (navigator.share) {
      navigator.share({ title:(activeTeam ? activeTeam.name : "Lineup") + " — Game Day Lineup", url:url })
        .catch(function(e) { if (e.name !== "AbortError") { copyToClipboard(url); } });
    } else {
      copyToClipboard(url);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        alert("Lineup link copied to clipboard!");
      }).catch(function() { promptCopy(text); });
    } else {
      promptCopy(text);
    }
  }

  function promptCopy(text) {
    var box = prompt("Copy this link:", text);
  }

  function exportTeamData() {
    if (!activeTeam) { return; }
    var payload = {
      exportedAt:  new Date().toISOString(),
      appVersion:  "1.0",
      team:        activeTeam,
      roster:      roster,
      schedule:    schedule,
      practices:   practices,
      battingOrder:battingOrder,
      grid:        grid,
      innings:     innings,
      locked:      lineupLocked
    };
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type:"application/json" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href   = url;
    a.download = (activeTeam.name || "team").replace(/[^a-z0-9]/gi,"-").toLowerCase()
                 + "-backup-" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importTeamData(file) {
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.team || !data.roster) { alert("Invalid backup file."); return; }
        // Restore all team data
        if (!confirm("This will overwrite current data for " + (data.team.name || "this team") + ". Continue?")) { return; }
        var tid = activeTeamId || data.team.id;
        saveJSON("team:" + tid + ":roster",    data.roster || []);
        saveJSON("team:" + tid + ":schedule",  data.schedule || []);
        saveJSON("team:" + tid + ":practices", data.practices || []);
        saveJSON("team:" + tid + ":batting",   data.battingOrder || []);
        saveJSON("team:" + tid + ":grid",      data.grid || {});
        saveJSON("team:" + tid + ":innings",   data.innings || 6);
        // Reload the team from storage
        if (activeTeam) {
          var t = {}; for (var k in activeTeam) { t[k] = activeTeam[k]; }
          loadTeam(t);
        }
        alert("Backup restored successfully.");
      } catch (err) {
        alert("Could not read backup file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- Team management ---
  function loadTeam(team) {
    var r = migrateRoster(loadJSON("team:" + team.id + ":roster", []));
    var s = migrateSchedule(loadJSON("team:" + team.id + ":schedule", []));
    var p = loadJSON("team:" + team.id + ":practices", []);
    var b = loadJSON("team:" + team.id + ":batting", r.map(function(x) { return x.name; }));
    var savedInnings = loadJSON("team:" + team.id + ":innings", 6) || 6;
    var savedGrid = migrateGrid(loadJSON("team:" + team.id + ":grid", null), r, savedInnings);
    var savedLocked = loadJSON("team:" + team.id + ":locked", false) || false;

    setActiveTeamId(team.id);
    saveJSON("ui:activeTeam", team.id);
    setRoster(r);
    setRosterHistory([]);
    setBattingOrder(b);
    setSchedule(s);
    setPractices(p);
    setGrid(savedGrid || initGrid(r, savedInnings));
    setInnings(savedInnings);
    setLineupDirty(false);
    setLineupLocked(savedLocked);
    setTab("roster");
    setScreen("app");
    track("load_team", { team_id: team.id, team_name: team.name });

    if (isSupabaseEnabled) {
      var loadTimestamp = Date.now();
      dbLoadTeamData(team.id).then(function(dbData) {
        if (!dbData) { return; }
        // Only hydrate if no local changes have been made since
        // this load was triggered (prevents overwriting coach edits)
        // We detect this by comparing the load timestamp against
        // window._lastLocalWrite which is set by every persist call
        var lastWrite = window._lastLocalWrite || 0;
        if (lastWrite > loadTimestamp) { return; }
        if (!dbData.roster || dbData.roster.length === 0) { return; }
        saveJSON("team:" + team.id + ":roster",    dbData.roster);
        saveJSON("team:" + team.id + ":schedule",  dbData.schedule);
        saveJSON("team:" + team.id + ":practices", dbData.practices);
        saveJSON("team:" + team.id + ":batting",   dbData.battingOrder);
        saveJSON("team:" + team.id + ":grid",      dbData.grid);
        saveJSON("team:" + team.id + ":innings",   dbData.innings);
        saveJSON("team:" + team.id + ":locked",    dbData.locked);
        setRoster(migrateRoster(dbData.roster));
        setSchedule(migrateSchedule(dbData.schedule));
        setPractices(dbData.practices);
        setBattingOrder(dbData.battingOrder && dbData.battingOrder.length
          ? dbData.battingOrder
          : dbData.roster.map(function(x) { return x.name; }));
        setGrid(migrateGrid(dbData.grid, dbData.roster, dbData.innings));
        setInnings(dbData.innings);
        setLineupLocked(dbData.locked);
      }).catch(function() {});
    }
  }

  function createTeam() {
    if (!newTeam.name.trim()) { return; }
    var t = {
      id: Date.now() + "",
      name: newTeam.name.trim(),
      ageGroup: newTeam.ageGroup.trim(),
      year: newTeam.year,
      sport: "baseball"
    };
    var next = teams.concat([t]);
    setTeams(next);
    saveJSON("app:teams", next);
    track("create_team", { age_group: t.ageGroup || "" });
    dbSync(function() { return dbSaveTeams([t]); });
    loadTeam(t);
  }

  function deleteTeam(id) {
    var next = teams.filter(function(t) { return t.id !== id; });
    setTeams(next);
    saveJSON("app:teams", next);
    dbSync(function() { return dbDeleteTeam(id); });
    if (activeTeamId === id) {
      saveJSON("ui:activeTeam", null);
      setActiveTeamId(null);
      setScreen("home");
    }
  }

  // --- Roster ---
  function addPlayer() {
    var fn = newFirstName.trim(); var ln = newLastName.trim();
    if (!fn || !ln) { return; }
    var capitalize = function(s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var n = capitalize(fn) + " " + capitalize(ln);
    if (players.indexOf(n) >= 0) { return; }
    var p = { name:n, firstName:capitalize(fn), lastName:capitalize(ln), skills:["developing"], tags:[], dislikes:[], prefs:[], batSkills:[] };
    var next = roster.concat([p]);
    persistRoster(next);
    track("add_player", { roster_size: next.length });
    persistBatting(battingOrder.concat([n]));
    var ng = {};
    for (var k in grid) { ng[k] = grid[k].slice(); }
    var row = [];
    for (var i = 0; i < innings; i++) { row.push(""); }
    ng[n] = row;
    persistGrid(ng);
    setNewFirstName(""); setNewLastName("");
  }

  function removePlayer(name) {
    persistRoster(roster.filter(function(r) { return r.name !== name; }));
    persistBatting(battingOrder.filter(function(p) { return p !== name; }));
    var ng = {};
    for (var k in grid) { if (k !== name) { ng[k] = grid[k].slice(); } }
    persistGrid(ng);
  }

  function updatePlayer(name, patch) {
    persistRoster(roster.map(function(r) {
      if (r.name !== name) { return r; }
      var updated = {};
      for (var k in r) { updated[k] = r[k]; }
      for (var k2 in patch) { updated[k2] = patch[k2]; }
      updated.lastUpdated = new Date().toISOString();
      return updated;
    }));
  }

  function isV2Open(playerName, section) {
    var key = playerName + "::" + section;
    if (key in v2SectionOpen) { return v2SectionOpen[key]; }
    return section === "Lineup Constraints";
  }
  function toggleV2Section(playerName, section) {
    var key = playerName + "::" + section;
    var next = {}; for (var k in v2SectionOpen) { next[k] = v2SectionOpen[k]; }
    next[key] = !isV2Open(playerName, section);
    setV2SectionOpen(next);
  }

  function generateLineup() {
    let result;

    try {
      if (FEATURE_FLAGS.USE_NEW_LINEUP_ENGINE) {
        console.log("[Lineup Engine] Using V2");
        result = generateLineupV2(roster, innings);
      } else {
        console.log("[Lineup Engine] Using V1");
        result = autoAssignWithRetryFallback(roster, innings);
      }
    } catch (e) {
      console.error("[Lineup Engine] V2 failed — fallback to V1", e);
      result = autoAssignWithRetryFallback(roster, innings);
    }

    console.log("GRID STRUCTURE:", result.grid);

    // 🔒 DO NOT MODIFY BELOW (existing behavior)
    persistGrid(result.grid);
    setLastAutoGrid(result.grid);
    setLineupDirty(false);
    setTab("grid");

    track("auto_assign", {
      attempts: result.attempts || 1,
      warnings: (result.warnings || []).length,
      valid: result.isValid ? "yes" : "no",
      roster_size: roster.length,
      innings: innings
    });

    if (result.usedFallback || !result.isValid) {
      console.warn("[Lineup Engine]", result.explain);
    }
  }

  function handleDrop(target) {
    if (!dragPlayer || dragPlayer === target) { return; }
    var order = battingOrder.slice();
    var from = order.indexOf(dragPlayer);
    var to   = order.indexOf(target);
    order.splice(from, 1);
    order.splice(to, 0, dragPlayer);
    persistBatting(order);
    setDragPlayer(null);
  }

  function moveBatter(name, dir) {
    var order = battingOrder.slice();
    var idx = order.indexOf(name);
    var next = idx + dir;
    if (next < 0 || next >= order.length) { return; }
    var tmp = order[idx];
    order[idx] = order[next];
    order[next] = tmp;
    persistBatting(order);
  }

  // --- Schedule helpers ---
  function saveGameForm() {
    if (!newGame.date || !newGame.opponent) { return; }
    var game = {};
    for (var k in newGame) { game[k] = newGame[k]; }
    if (editingGame) {
      game.id = editingGame.id;
      persistSchedule(schedule.map(function(g) { return g.id === editingGame.id ? game : g; }));
    } else {
      game.id = Date.now() + "";
      persistSchedule(schedule.concat([game]));
    }
    setNewGame({ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:{} });
    setShowGameForm(false);
    setEditingGame(null);
  }

  function deleteGame(id) {
    persistSchedule(schedule.filter(function(g) { return g.id !== id; }));
  }

  // --- Practice helpers ---
  function savePracForm() {
    if (!newPrac.date) { return; }
    var p = {};
    for (var k in newPrac) { p[k] = newPrac[k]; }
    if (editingPrac) {
      p.id = editingPrac.id;
      persistPractices(practices.map(function(x) { return x.id === editingPrac.id ? p : x; }));
    } else {
      p.id = Date.now() + "";
      persistPractices(practices.concat([p]));
    }
    setNewPrac({ date:"", duration:"", focus:"Mixed", attendance:{}, drills:[], notes:"" });
    setEditingPrac(null);
    setShowPracForm(false);
  }

  // --- Feedback helpers ---
  function submitFeedback() {
    if (!fbBody.trim()) { return; }
    var appVer = APP_VERSION;
    var entry = { id: Date.now() + "", category: fbCategory, body: fbBody.trim(), changeTypes: fbChangeTypes.slice(), timestamp: Date.now(), appVersion: appVer };
    var existing = [];
    try { existing = loadJSON("feedback:submissions", []); } catch(e) {}
    try { saveJSON("feedback:submissions", existing.concat([entry])); } catch(e) {}
    (async function() {
      try {
        var BACKEND = "https://lineup-generator-backend.onrender.com";
        var sessionRes = await supabase.auth.getSession();
        var token = sessionRes.data.session?.access_token;
        if (token) {
          await fetch(BACKEND + "/api/v1/feedback", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "feedback", category: entry.category, body: entry.body, changeTypes: entry.changeTypes, appVersion: entry.appVersion })
          });
        }
      } catch(e) { console.warn("[feedback] POST failed:", e.message); }
    })();
    setFbBody("");
    setFbChangeTypes([]);
    setFbCategory("General");
    setFbConfirm("Thanks! Your feedback has been saved.");
    setTimeout(function() { setFbConfirm(""); }, 2000);
  }

  function submitBug() {
    if (!bugBody.trim()) { return; }
    var appVer = APP_VERSION;
    var entry = { id: Date.now() + "", location: bugLocation, body: bugBody.trim(), severity: bugSeverity, timestamp: Date.now(), appVersion: appVer };
    var existing = [];
    try { existing = loadJSON("feedback:bugs", []); } catch(e) {}
    try { saveJSON("feedback:bugs", existing.concat([entry])); } catch(e) {}
    (async function() {
      try {
        var BACKEND = "https://lineup-generator-backend.onrender.com";
        var sessionRes = await supabase.auth.getSession();
        var token = sessionRes.data.session?.access_token;
        if (token) {
          await fetch(BACKEND + "/api/v1/feedback", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "bug", location: entry.location, body: entry.body, severity: entry.severity, appVersion: entry.appVersion })
          });
        }
      } catch(e) { console.warn("[feedback] POST failed:", e.message); }
    })();
    setBugBody("");
    setBugLocation("");
    setBugSeverity("");
    setBugConfirm("Issue reported. Thank you!");
    setTimeout(function() { setBugConfirm(""); }, 2000);
  }

  // --- AI schedule parser ---
  function callAI(messages) {
    var BACKEND = "https://lineup-generator-backend.onrender.com";
    return fetch(BACKEND + "/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "schedule",
        systemPrompt: "You are a baseball schedule parser. Return ONLY a valid JSON array of game objects. Each object: { date:'YYYY-MM-DD', time:'HH:MM AM/PM', opponent:'Team Name', location:'Field', result:'', ourScore:'', theirScore:'', battingPerf:{} }. No markdown, no explanation. Empty array if no games found.",
        userContent: messages[0].content
      })
    }).then(function(res) {
      if (!res.ok) { throw new Error("Backend error " + res.status); }
      return res.json();
    }).then(function(data) {
      var block = data.content && data.content.filter(function(b) { return b.type === "text"; })[0];
      var text = block ? block.text : "[]";
      var clean = text.replace(/^```[\w]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return JSON.parse(clean);
    });
  }

  function parseGameResult(sourceType, sourceData, mediaType) {
    // sourceType: "image" | "pdf" | "text"
    // Parses a box score / game result and returns { result, ourScore, theirScore, battingPerf }
    var rosterNames = roster.map(function(r) { return r.name; }).join(", ");
    var systemPrompt = "You are a baseball box score parser. " +
      "Extract game result and individual batting stats. " +
      "Team name is " + teamName + ". Players to look for: " + rosterNames + ". " +
      "Return ONLY valid JSON with this structure: " +
      '{ "result": "W" or "L" or "T", "ourScore": "7", "theirScore": "3", ' +
      '"battingPerf": { "PlayerName": { "ab": 3, "h": 2, "r": 1, "rbi": 1, "bb": 0 } } }. ' +
      "Only include players you find stats for. No markdown, no explanation.";

    var userContent;
    if (sourceType === "image") {
      userContent = [
        { type:"image", source:{ type:"base64", media_type: mediaType || "image/png", data: sourceData } },
        { type:"text", text:"Parse this box score or game result image. Extract the final score and individual batting stats for " + teamName + " players." }
      ];
    } else if (sourceType === "pdf") {
      userContent = [
        { type:"document", source:{ type:"base64", media_type:"application/pdf", data: sourceData } },
        { type:"text", text:"Parse this box score or game result PDF. Extract the final score and individual batting stats for " + teamName + " players." }
      ];
    } else {
      userContent = "Parse this game result. Extract final score and batting stats for " + teamName + " players.\n\n" + sourceData;
    }

    var BACKEND = "https://lineup-generator-backend.onrender.com";
    return fetch(BACKEND + "/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "result",
        systemPrompt: systemPrompt,
        userContent: userContent
      })
    }).then(function(res) {
      if (!res.ok) { throw new Error("Backend error " + res.status); }
      return res.json();
    }).then(function(data) {
      var block = data.content && data.content.filter(function(b) { return b.type === "text"; })[0];
      var text = block ? block.text : "{}";
      var clean = text.replace(/^```[a-zA-Z0-9]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return JSON.parse(clean);
    });
  }

  function parseScheduleText(text) {
    setImportState({ mode:"text", text:text, image:null, loading:true, error:"", preview:[] });
    callAI([{ role:"user", content:"Extract all games. Team is " + (activeTeam ? activeTeam.name : "our team") + ". Year: " + new Date().getFullYear() + ".\n\n" + text }])
      .then(function(games) {
        var preview = games.map(function(g) {
          var gp = {}; for (var k in g) { gp[k] = g[k]; } gp.id = Date.now() + Math.random() + "";
          return gp;
        });
        track("import_schedule_text", { games_found: games.length });
        setImportState({ mode:"text", text:text, image:null, loading:false, error:"", preview:preview });
      })
      .catch(function() {
        setImportState({ mode:"text", text:text, image:null, loading:false, error:"Could not parse. Try again.", preview:[] });
      });
  }

  function parseScheduleImage(b64, mediaType) {
    setImportState({ mode:"image", text:"", image:{ b64:b64, mediaType:mediaType }, loading:true, error:"", preview:[] });
    callAI([{ role:"user", content:[
      { type:"image", source:{ type:"base64", media_type:mediaType, data:b64 } },
      { type:"text", text:"Extract all game schedule info. Team is " + (activeTeam ? activeTeam.name : "our team") + "." }
    ]}])
      .then(function(games) {
        var preview = games.map(function(g) {
          var gp = {}; for (var k in g) { gp[k] = g[k]; } gp.id = Date.now() + Math.random() + "";
          return gp;
        });
        track("import_schedule_photo", { games_found: games.length });
        setImportState({ mode:"image", text:"", image:{ b64:b64, mediaType:mediaType }, loading:false, error:"", preview:preview });
      })
      .catch(function() {
        setImportState({ mode:"image", text:"", image:null, loading:false, error:"Could not read image.", preview:[] });
      });
  }

  function confirmImport() {
    persistSchedule(schedule.concat(importState.preview));
    setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] });
    setImportMode(null);
  }

  // handleImageFile removed - image import uses paste/drop inline


  // ============================================================
  // HOME SCREEN
  // ============================================================
  function renderHome() {
    var now = new Date();
    var hour = now.getHours();
    var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    var dateStr = now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

    function getNextGame(team) {
      var today = new Date(); today.setHours(0,0,0,0);
      // Use live state for active team, storage for others
      var sched = (team.id === activeTeamId) ? schedule : loadJSON("team:" + team.id + ":schedule", []);
      var upcoming = [];
      for (var i = 0; i < sched.length; i++) {
        var g = sched[i];
        if (!g.result && g.date) {
          var d = new Date(g.date + "T12:00:00");
          if (d >= today) { upcoming.push({ game:g, d:d }); }
        }
      }
      upcoming.sort(function(a,b) { return a.d - b.d; });
      if (!upcoming.length) { return null; }
      var days = Math.round((upcoming[0].d - today) / 86400000);
      return { game: upcoming[0].game, days: days };
    }

    function getNextPractice(team) {
      var today = new Date(); today.setHours(0,0,0,0);
      var pracs = (team.id === activeTeamId) ? practices : loadJSON("team:" + team.id + ":practices", []);
      var upcoming = [];
      for (var i = 0; i < pracs.length; i++) {
        if (pracs[i].date) {
          var d = new Date(pracs[i].date + "T12:00:00");
          if (d >= today) { upcoming.push(d); }
        }
      }
      upcoming.sort(function(a,b) { return a-b; });
      if (!upcoming.length) { return null; }
      return Math.round((upcoming[0] - today) / 86400000);
    }

    function TeamCard(props) {
      var team = props.team;
      // For the active team, use live React state for accurate counts.
      // For other teams, read from storage.
      var teamRoster, teamSched;
      if (team.id === activeTeamId) {
        teamRoster = roster;
        teamSched  = schedule;
      } else {
        teamRoster = loadJSON("team:" + team.id + ":roster", []);
        teamSched  = loadJSON("team:" + team.id + ":schedule", []);
      }
      var wins = 0; var losses = 0; var played = 0;
      for (var i = 0; i < teamSched.length; i++) {
        if (teamSched[i].result === "W") { wins++; played++; }
        else if (teamSched[i].result === "L") { losses++; played++; }
        else if (teamSched[i].result === "T") { played++; }
        // result "X" = canceled, not counted
      }
      var remaining = teamSched.length - played;
      var nextGame     = getNextGame(team);
      var nextPracDays = getNextPractice(team);
      var hasRoster    = teamRoster.length > 0;
      var hasSched     = teamSched.length > 0;

      var pill = null;
      var pillStyle = { fontSize:"11px", padding:"6px 12px", borderRadius:"8px", marginTop:"8px" };
      if (!hasRoster) {
        pill = "Add your roster to get started";
        pillStyle.background = "rgba(200,144,46,0.15)"; pillStyle.color = "#c8902e";
      } else if (!hasSched) {
        pill = "No schedule yet - tap to add games";
        pillStyle.background = "rgba(200,144,46,0.15)"; pillStyle.color = "#c8902e";
      } else if (nextGame && nextGame.days === 0) {
        pill = "GAME DAY vs " + nextGame.game.opponent + (nextGame.game.time ? " at " + nextGame.game.time : "");
        pillStyle.background = "rgba(200,16,46,0.9)"; pillStyle.color = "#fff"; pillStyle.fontWeight = "bold";
      } else if (nextGame && nextGame.days === 1) {
        pill = "Game TOMORROW vs " + nextGame.game.opponent;
        pillStyle.background = "rgba(245,200,66,0.2)"; pillStyle.color = "#a07010"; pillStyle.fontWeight = "bold";
      } else if (nextGame) {
        var gameDate = new Date(nextGame.game.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
        pill = "Next game in " + nextGame.days + " days - " + gameDate + " vs " + nextGame.game.opponent;
        pillStyle.background = "rgba(255,255,255,0.08)"; pillStyle.color = "rgba(255,255,255,0.6)";
      } else {
        pill = "Season complete - no upcoming games";
        pillStyle.background = "rgba(255,255,255,0.05)"; pillStyle.color = "rgba(255,255,255,0.35)";
      }

      return (
        <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:"12px", padding:"16px 18px", marginBottom:"10px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:"bold", fontSize:"17px", color:"#fff", marginBottom:"4px" }}>
                {team.name}
                {team.ageGroup ? <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", marginLeft:"8px", fontWeight:"normal", background:"rgba(255,255,255,0.08)", padding:"1px 8px", borderRadius:"10px" }}>{team.ageGroup}</span> : null}
                {played > 0 ? <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", marginLeft:"8px", fontWeight:"normal" }}>{wins}W - {losses}L{played - wins - losses > 0 ? " - " + (played-wins-losses) + "T" : ""}</span> : null}
              </div>
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", display:"flex", gap:"12px", flexWrap:"wrap" }}>
                <span>{teamRoster.length} player{teamRoster.length !== 1 ? "s" : ""}</span>
                {teamSched.length > 0 ? (
                  <span>
                    {played > 0 ? played + " played" : ""}
                    {played > 0 && remaining > 0 ? " / " : ""}
                    {remaining > 0 ? remaining + " to go" : ""}
                    {played === 0 && remaining === 0 ? teamSched.length + " games" : ""}
                  </span>
                ) : null}
                {nextPracDays === 0 ? <span style={{ color:"#f5c842" }}>Practice today</span> : nextPracDays !== null ? <span>Practice in {nextPracDays}d</span> : null}
              </div>
            </div>
            <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
              <button onClick={function() { loadTeam(team); }} style={{ padding:"8px 18px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"13px", fontFamily:"inherit", background:"linear-gradient(135deg,#c8102e,#9b0c22)", color:"#fff" }}>
                Open
              </button>
              {activeTeamId === team.id ? (
                <button onClick={exportTeamData} title="Download backup"
                  style={{ padding:"8px 10px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.2)", cursor:"pointer", fontSize:"13px", fontFamily:"inherit", background:"transparent", color:"rgba(255,255,255,0.55)" }}>
                  ⬇
                </button>
              ) : null}
            </div>
          </div>
          <div style={pillStyle}>{pill}</div>
        </div>
      );
    }

    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0f1f3d 0%,#1a3260 55%,#2a0a0a 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px", fontFamily:"Georgia,serif" }}>

        <div style={{ marginBottom:"16px", textAlign:"center" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"#c8102e", border:"2.5px solid #f5c842", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", fontWeight:"bold", color:"#f5c842", margin:"0 auto 12px" }}>M</div>
          <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"4px" }}>{greeting}, Coach!</div>
          <div style={{ fontSize:"26px", fontWeight:"bold", color:"#f5c842", marginBottom:"8px" }}>Lineup Generator</div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"20px", padding:"5px 14px" }}>
            <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.7)" }}>{dateStr}</span>
          </div>
        </div>

        <div style={{ width:"100%", maxWidth:"500px" }}>
          {homeMode === "welcome" ? (
            <div>
              {teams.length > 0 ? (
                <div style={{ marginBottom:"14px" }}>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"10px", textAlign:"center" }}>Your Teams</div>
                  {teams.map(function(t) { return <TeamCard key={t.id} team={t} />; })}
                </div>
              ) : null}
              <button onClick={function() { setHomeMode("create"); }} style={{ width:"100%", padding:"13px", borderRadius:"12px", border:"2px dashed rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.55)", fontSize:"13px", fontFamily:"inherit", cursor:"pointer", marginBottom:"14px" }}>
                + Create New Team
              </button>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.18)" }}>All data saved locally on this device</div>
              </div>
            </div>
          ) : (
            <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"14px", padding:"22px" }}>
              <div style={{ fontSize:"15px", fontWeight:"bold", color:"#fff", marginBottom:"16px" }}>Create a New Team</div>
              {[["Team Name", "name","text"],["Age Group","ageGroup","text"]].map(function(row) {
                return (
                  <div key={row[1]} style={{ marginBottom:"12px" }}>
                    <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"5px" }}>{row[0]}</div>
                    <input type={row[2]} value={newTeam[row[1]]} placeholder={row[0]}
                      maxLength={row[1] === "name" ? 40 : 20}
                      onChange={function(field) { return function(e) { var next = {}; for (var k in newTeam) { next[k]=newTeam[k]; } next[field]=e.target.value; setNewTeam(next); }; }(row[1])}
                      style={{ width:"100%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", padding:"10px 12px", color:"#fff", fontFamily:"inherit", fontSize:"13px", outline:"none", boxSizing:"border-box" }} />
                  </div>
                );
              })}
              <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>
                <button onClick={createTeam} disabled={!newTeam.name.trim()} style={{ flex:1, padding:"12px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"14px", fontFamily:"inherit", background: newTeam.name.trim() ? "linear-gradient(135deg,#c8102e,#9b0c22)" : "rgba(255,255,255,0.1)", color: newTeam.name.trim() ? "#fff" : "rgba(255,255,255,0.3)" }}>
                  Create Team
                </button>
                <button onClick={function() { setHomeMode("welcome"); }} style={{ padding:"12px 16px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.18)", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:"13px", fontFamily:"inherit", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // ROSTER TAB
  // ============================================================
  function renderRoster() {
    var skillKeys   = Object.keys(SKILLS);
    var tagKeys     = Object.keys(TAGS);
    var batKeys     = Object.keys(BAT_SKILLS);

    function toggle(arr, key) {
      var idx = arr.indexOf(key);
      if (idx >= 0) { return arr.filter(function(x) { return x !== key; }); }
      return arr.concat([key]);
    }

    function setPrefs(playerName, pos, currentPrefs) {
      var prefs = currentPrefs ? currentPrefs.slice() : [];
      var idx = prefs.indexOf(pos);
      if (idx >= 0) {
        // Already in list - remove it, keep remaining order intact
        prefs = prefs.filter(function(p) { return p !== pos; });
      } else {
        // Not in list - append to end (becomes lowest-priority pref)
        prefs = prefs.concat([pos]);
      }
      updatePlayer(playerName, { prefs: prefs });
    }

    function getTopPositions(info) {
      var results = [];
      for (var pi = 0; pi < FIELD_POSITIONS.length; pi++) {
        var pos = FIELD_POSITIONS[pi];
        var sc = scorePosition(info.name, pos, 0, {}, roster);
        if (sc > 0) { results.push({ pos: pos, sc: sc }); }
      }
      results.sort(function(a,b) { return b.sc - a.sc; });
      return results.slice(0, 3);
    }

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", flexWrap:"wrap", gap:"8px" }}>
          <div style={S.sectionTitle}>Roster and Player Profiles</div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
            {rosterHistory.length > 0 ? (
              <button style={{ ...S.btn("ghost"), color:C.red, border:"1px solid rgba(200,16,46,0.3)" }}
                onClick={undoRoster}>
                Undo ({rosterHistory.length})
              </button>
            ) : null}
            <button style={S.btn("ghost")} onClick={function() { setShowSummary(!showSummary); }}>
              {showSummary ? "Close Summary" : "Quick Summary"}
            </button>
            <button style={S.btn("ghost")} onClick={function() {
              var allCol = true;
              for (var i = 0; i < roster.length; i++) {
                if (!collapsed[roster[i].name]) { allCol = false; break; }
              }
              var next = {};
              if (!allCol) { for (var i = 0; i < roster.length; i++) { next[roster[i].name] = true; } }
              setCollapsed(next);
            }}>
              {(function() {
                var allCol = true;
                for (var i = 0; i < roster.length; i++) { if (!collapsed[roster[i].name]) { allCol = false; break; } }
                return allCol ? "Expand All" : "Collapse All";
              })()}
            </button>
          </div>
        </div>

        {showSummary ? (
          <div style={S.card}>
            <div style={S.sectionTitle}>All Players - Quick Summary</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    {["Player","Skills","Tags","Preferred","Avoids","Top Positions"].map(function(h) {
                      return <th key={h} style={{ padding:"7px 10px", textAlign:"left", color:"#6a7a9a", fontSize:"10px", letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", whiteSpace:"nowrap" }}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roster.map(function(info) {
                    var top = getTopPositions(info);
                    return (
                      <tr key={info.name} style={{ borderBottom:"1px solid rgba(15,31,61,0.05)" }}>
                        <td style={{ padding:"8px 10px", fontWeight:"bold" }}>{firstName(info.name)}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
                            {(info.skills || []).map(function(sk) {
                              var s = SKILLS[sk]; if (!s) { return null; }
                              return <span key={sk} style={{ fontSize:"10px", padding:"1px 5px", borderRadius:"8px", background:s.color+"22", color:s.color, fontWeight:"bold", whiteSpace:"nowrap" }}>{s.label}</span>;
                            })}
                          </div>
                        </td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
                            {(info.tags || []).map(function(tk) {
                              var t = TAGS[tk]; if (!t) { return null; }
                              return <span key={tk} style={{ fontSize:"10px", padding:"1px 5px", borderRadius:"8px", background:t.color+"22", color:t.color, fontWeight:"bold", whiteSpace:"nowrap" }}>{t.label}</span>;
                            })}
                            {(!info.tags || info.tags.length === 0) ? <span style={{ color:"#ccc", fontSize:"10px" }}>none</span> : null}
                          </div>
                        </td>
                        <td style={{ padding:"8px 10px" }}>
                          {(info.prefs || []).map(function(pos, idx) {
                            return <span key={pos} style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"4px", background:POS_COLORS[pos]+"cc", color:"#fff", fontWeight:"bold", marginRight:"3px" }}>{idx + 1}.{pos}</span>;
                          })}
                          {(!info.prefs || info.prefs.length === 0) ? <span style={{ color:"#ccc", fontSize:"10px" }}>none</span> : null}
                        </td>
                        <td style={{ padding:"8px 10px" }}>
                          {(info.dislikes || []).map(function(pos) {
                            return <span key={pos} style={{ fontSize:"10px", padding:"1px 5px", borderRadius:"4px", background:"rgba(200,16,46,0.1)", color:"#c8102e", fontWeight:"bold", marginRight:"3px", textDecoration:"line-through" }}>{pos}</span>;
                          })}
                          {(!info.dislikes || info.dislikes.length === 0) ? <span style={{ color:"#ccc", fontSize:"10px" }}>none</span> : null}
                        </td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", gap:"3px" }}>
                            {top.map(function(item, idx) {
                              return <span key={item.pos} style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"4px", background:POS_COLORS[item.pos]+"cc", color:"#fff", fontWeight:"bold", opacity: idx === 0 ? 1 : idx === 1 ? 0.75 : 0.5 }}>{item.pos}</span>;
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"14px", alignItems:"center" }}>
          <input value={newFirstName} onChange={function(e) { setNewFirstName(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") { addPlayer(); } }}
            placeholder="First name*" maxLength={20} style={{ ...S.input, flex:"1 1 120px" }} />
          <input value={newLastName} onChange={function(e) { setNewLastName(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") { addPlayer(); } }}
            placeholder="Last name*" maxLength={20} style={{ ...S.input, flex:"1 1 120px" }} />
          <button style={S.btn("primary")} onClick={addPlayer}>Add</button>
          <button style={S.btn("ghost")} onClick={function() {
            if (confirm("Reset roster to default players for " + (activeTeam ? activeTeam.name : "this team") + "?")) {
              persistRoster(DEFAULT_ROSTER);
              persistBatting(DEFAULT_ROSTER.map(function(r) { return r.name; }));
              persistGrid(initGrid(DEFAULT_ROSTER, innings));
            }
          }}>Reset</button>
        </div>

        <div style={{ display:"flex", gap:"8px", marginBottom:"16px", alignItems:"center" }}>
          <span style={{ fontSize:"12px", color:C.textMuted }}>Innings:</span>
          {[6,7].map(function(n) {
            return <button key={n} style={{ ...S.btn(innings === n ? "primary" : "ghost"), padding:"5px 14px" }} onClick={function() {
              persistInnings(n);
              setLineupDirty(true);
              var ng = {};
              for (var pi = 0; pi < players.length; pi++) {
                var p = players[pi];
                var existing = grid[p] || [];
                var row = [];
                for (var i = 0; i < n; i++) { row.push(existing[i] || ""); }
                ng[p] = row;
              }
              persistGrid(ng);
            }}>{n}</button>;
          })}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"12px" }}>
          {roster.map(function(info) {
            var isCol = !!collapsed[info.name];
            var sk = info.skills || [];
            var tg = info.tags || [];
            var dl = info.dislikes || [];
            var pr = info.prefs || [];
            var bs = info.batSkills || [];

            return (
              <div key={info.name} style={{ ...S.card, padding:"14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom: isCol ? 0 : "12px" }}>
                  <button onClick={function(n) { return function() { var next = {}; for (var k in collapsed) { next[k]=collapsed[k]; } next[n] = !collapsed[n]; setCollapsed(next); }; }(info.name)}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:"11px", color:C.textMuted, padding:"2px", flexShrink:0 }}>
                    {isCol ? ">" : "v"}
                  </button>
                  <div style={{ fontWeight:"bold", fontSize:"14px", flex:1 }}>{info.name}</div>
                  {isCol ? (
                    <div style={{ display:"flex", gap:"2px", flexWrap:"wrap" }}>
                      {sk.map(function(key) {
                        var s = SKILLS[key]; if (!s) { return null; }
                        return <span key={key} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"8px", background:s.color+"22", color:s.color, fontWeight:"bold" }}>{s.label}</span>;
                      })}
                      {pr.map(function(pos, i) {
                        return <span key={pos} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"4px", background:POS_COLORS[pos]+"cc", color:"#fff", fontWeight:"bold" }}>{i===0?"1.":"2."}{pos}</span>;
                      })}
                    </div>
                  ) : null}
                  <button onClick={function(n) { return function() { if (confirm("Remove " + n + "?")) { removePlayer(n); } }; }(info.name)}
                    style={{ background:"none", border:"none", color:"#b0a0a0", cursor:"pointer", fontSize:"13px", padding:"2px 6px" }}>x</button>
                </div>

                {!isCol ? (
                  <div>
                    {(function() {
                      function formatLastUpdated(iso) {
                        var d = new Date(iso);
                        var now = new Date();
                        var timeStr = d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
                        var dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        var nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        var diff = nDate - dDate;
                        if (diff === 0) { return "Today at " + timeStr; }
                        if (diff === 86400000) { return "Yesterday at " + timeStr; }
                        return d.toLocaleDateString([], { month:"short", day:"numeric" }) + " at " + timeStr;
                      }
                      if (!info.lastUpdated) { return null; }
                      return <div style={{ fontSize:"10px", color:"#9ca3af", textAlign:"right", marginBottom:"8px", fontStyle:"italic" }}>Last updated: {formatLastUpdated(info.lastUpdated)}</div>;
                    })()}
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"10px",
                      padding:"6px 8px", borderRadius:"6px", background:"rgba(15,31,61,0.03)",
                      border:"1px solid rgba(15,31,61,0.07)" }}>
                      {[
                        { color:"#27ae60", label:"Strength" },
                        { color:"#2471a3", label:"Strong" },
                        { color:"#d4a017", label:"Developing" },
                        { color:"#c8102e", label:"Risk" },
                        { color:"#7f8c8d", label:"Attribute" }
                      ].map(function(item) {
                        return (
                          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                            <span style={{ width:"6px", height:"6px", borderRadius:"50%",
                              background:item.color, display:"inline-block", flexShrink:0 }}></span>
                            <span style={{ fontSize:"9px", color:C.textMuted }}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* ── V2 Player Profile: Lineup Constraints ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Lineup Constraints");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Lineup Constraints</span>
                        <span>{isV2Open(info.name,"Lineup Constraints") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Lineup Constraints") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Game Day</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {(function() {
                              var sbActive  = !!info.skipBench;
                              var outActive = !!info.outThisGame || tg.indexOf("absent") >= 0;
                              return (
                                <span>
                                  <span style={S.badge("#c8102e", sbActive)} onClick={function(a){return function(){updatePlayer(info.name,{skipBench:!a});};}(sbActive)}>Skip Bench</span>
                                  <span style={S.badge("#c8102e", outActive)} onClick={function(a,tgArr){return function(){
                                    var newOut  = !a;
                                    var newTags = newOut
                                      ? (tgArr.indexOf("absent") < 0 ? tgArr.concat(["absent"]) : tgArr)
                                      : tgArr.filter(function(t){return t !== "absent";});
                                    updatePlayer(info.name, {outThisGame: newOut, tags: newTags});
                                  };}(outActive, tg)}>Out This Game</span>
                                </span>
                              );
                            })()}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Preferred Positions</span>
                          <div style={{ fontSize:"10px", color:C.textMuted, marginBottom:"6px" }}>
                            Tap to add in priority order. 1st pick gets the biggest boost. Tap again to remove.
                          </div>
                          <div style={{ marginBottom:"6px" }}>
                            {FIELD_POSITIONS.map(function(pos) {
                              var rank = pr.indexOf(pos);
                              var active = rank >= 0;
                              var opacity = rank === 0 ? "ff" : rank === 1 ? "dd" : rank === 2 ? "bb" : rank === 3 ? "99" : "88";
                              return (
                                <span key={pos} onClick={function(p) { return function() { setPrefs(info.name, p, pr); }; }(pos)}
                                  style={{ display:"inline-block", padding:"3px 8px", margin:"2px", borderRadius:"6px", fontSize:"10px", fontWeight:"bold", cursor:"pointer",
                                    background: active ? POS_COLORS[pos] + opacity : POS_COLORS[pos]+"18",
                                    color: active ? "#fff" : POS_COLORS[pos],
                                    border:"1px solid " + POS_COLORS[pos] + (active ? "ff" : "44") }}>
                                  {active ? (rank + 1) + "." : ""}{pos}
                                </span>
                              );
                            })}
                          </div>
                          {pr.length > 0 ? (
                            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"6px", alignItems:"center" }}>
                              <span style={{ fontSize:"10px", color:C.textMuted }}>Order:</span>
                              {pr.map(function(pos, ri) {
                                return (
                                  <span key={pos} style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"4px",
                                    background: POS_COLORS[pos] + "cc", color:"#fff", fontWeight:"bold" }}>
                                    {ri + 1}. {pos}
                                  </span>
                                );
                              })}
                              <span onClick={function() { updatePlayer(info.name, { prefs: [] }); }}
                                style={{ fontSize:"10px", color:C.textMuted, cursor:"pointer", marginLeft:"4px", textDecoration:"underline" }}>
                                clear
                              </span>
                            </div>
                          ) : null}
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Avoid Positions</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {FIELD_POSITIONS.map(function(pos) {
                              var active = dl.indexOf(pos) >= 0;
                              return <span key={pos} style={S.badge("#c8102e", active)} onClick={function(p) { return function() { updatePlayer(info.name, { dislikes: toggle(dl, p) }); }; }(pos)}>{pos}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Fielding (+ Field Awareness) ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Fielding");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Fielding</span>
                        <span>{isV2Open(info.name,"Fielding") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Fielding") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Reliability</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Reliability","high"],["Average Reliability","average"],["Needs Support","needs_support"]].map(function(opt) {
                              var active = info.reliability === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{reliability:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Reaction Timing</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Quick Reaction","quick"],["Average Reaction","average"],["Slow Reaction","slow"]].map(function(opt) {
                              var active = info.reaction === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{reaction:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Arm Strength</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Strong Arm","strong"],["Average Arm","average"],["Developing Arm","developing"]].map(function(opt) {
                              var active = info.armStrength === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{armStrength:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Ball Type</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Ground Ball","ground_ball"],["Fly Ball","fly_ball"],["Both","both"],["Developing","developing"]].map(function(opt) {
                              var active = info.ballType === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{ballType:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Field Awareness</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Knows Where to Throw","knowsWhereToThrow"],["Calls for Ball","callsForBall"],["Backs Up Plays","backsUpPlays"],["Anticipates Plays","anticipatesPlays"]].map(function(opt) {
                              var active = !!info[opt[1]];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(f,a){return function(){var patch={};patch[f]=!a;updatePlayer(info.name,patch);};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Batting (+ Batting Awareness) ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Batting");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Batting</span>
                        <span>{isV2Open(info.name,"Batting") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Batting") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Contact</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Contact","high"],["Medium Contact","medium"],["Developing Contact","developing"]].map(function(opt) {
                              var active = info.contact === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{contact:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Power</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Power","high"],["Medium Power","medium"],["Low Power","low"]].map(function(opt) {
                              var active = info.power === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{power:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Swing Discipline</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Disciplined","disciplined"],["Free Swinger","free_swinger"]].map(function(opt) {
                              var active = info.swingDiscipline === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{swingDiscipline:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Batting Awareness</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Tracks Ball Well","tracksBallWell"],["Patient at Plate","patientAtPlate"],["Confident Hitter","confidentHitter"]].map(function(opt) {
                              var active = !!info[opt[1]];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(f,a){return function(){var patch={};patch[f]=!a;updatePlayer(info.name,patch);};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Base Running ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Base Running");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Base Running</span>
                        <span>{isV2Open(info.name,"Base Running") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Base Running") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Speed</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Fast","fast"],["Average","average"],["Developing","developing"]].map(function(opt) {
                              var active = info.speed === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{speed:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Running Awareness</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Runs Through First","runsThroughFirst"],["Listens to Coaches","listensToCoaches"],["Aware on Bases","awareOnBases"]].map(function(opt) {
                              var active = !!info[opt[1]];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(f,a){return function(){var patch={};patch[f]=!a;updatePlayer(info.name,patch);};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Effort ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Effort");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Effort</span>
                        <span>{isV2Open(info.name,"Effort") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Effort") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Effort Level</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Effort","high"],["Average Effort","average"],["Needs Encouragement","needs_encouragement"]].map(function(opt) {
                              var active = info.effort === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{effort:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Development Focus ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Development Focus");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Development Focus</span>
                        <span>{isV2Open(info.name,"Development Focus") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Development Focus") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Development Priority</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Needs Infield Reps","infield"],["Needs Outfield Reps","outfield"],["Balanced","balanced"]].map(function(opt) {
                              var active = info.developmentFocus === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{developmentFocus:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {(function() {
                      var st = { ab:0, h:0, r:0, rbi:0, bb:0, games:0 };
                      for (var sgi = 0; sgi < schedule.length; sgi++) {
                        var sg = schedule[sgi];
                        if (!sg.result || !sg.battingPerf || !sg.battingPerf[info.name]) { continue; }
                        var perf = sg.battingPerf[info.name];
                        st.ab   += parseInt(perf.ab  || 0, 10);
                        st.h    += parseInt(perf.h   || 0, 10);
                        st.r    += parseInt(perf.r   || 0, 10);
                        st.rbi  += parseInt(perf.rbi || 0, 10);
                        st.bb   += parseInt(perf.bb  || 0, 10);
                        st.games++;
                      }
                      if (st.games === 0) { return null; }
                      var avg = st.ab > 0 ? (st.h / st.ab).toFixed(3).replace(/^0/, "") : "-";
                      var avgColor = st.ab > 0 && (st.h/st.ab) >= 0.300 ? C.win : st.ab > 0 && (st.h/st.ab) >= 0.200 ? "#d4a017" : C.textMuted;
                      return (
                        <div style={{ marginBottom:"10px" }}>
                          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"6px" }}>Season Batting Record ({st.games} game{st.games !== 1 ? "s" : ""})</div>
                          <div style={{ display:"flex", gap:"12px", padding:"8px 12px", borderRadius:"8px", background:"rgba(15,31,61,0.04)", border:"1px solid rgba(15,31,61,0.08)" }}>
                            {[
                              ["AVG", avg, avgColor],
                              ["AB",  st.ab + "", C.text],
                              ["H",   st.h  + "", C.text],
                              ["R",   st.r  + "", C.text],
                              ["RBI", st.rbi + "", C.text],
                              ["BB",  st.bb  + "", C.text]
                            ].map(function(row) {
                              return (
                                <div key={row[0]} style={{ textAlign:"center" }}>
                                  <div style={{ fontSize:"13px", fontWeight:"bold", color:row[2] }}>{row[1]}</div>
                                  <div style={{ fontSize:"9px", color:"rgba(15,31,61,0.35)", letterSpacing:"0.06em", textTransform:"uppercase" }}>{row[0]}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop:"6px" }}>
                            {schedule.filter(function(sg) {
                              return sg.result && sg.battingPerf && sg.battingPerf[info.name];
                            }).sort(function(a,b) {
                              return new Date(b.date + "T12:00:00") - new Date(a.date + "T12:00:00");
                            }).slice(0, 3).map(function(sg) {
                              var p = sg.battingPerf[info.name];
                              var gameAvg = parseInt(p.ab||0,10) > 0 ? (parseInt(p.h||0,10)/parseInt(p.ab||0,10)).toFixed(3).replace(/^0/,"") : "-";
                              var rc = sg.result === "W" ? C.win : sg.result === "L" ? C.red : "#d4a017";
                              return (
                                <div key={sg.id} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"11px", padding:"3px 0", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                                  <span style={{ fontSize:"10px", fontWeight:"bold", color:rc, minWidth:"12px" }}>{sg.result}</span>
                                  <span style={{ color:C.textMuted, flex:1 }}>vs {sg.opponent}</span>
                                  <span style={{ color:C.textMuted }}>{p.ab || 0}-AB</span>
                                  <span style={{ color:C.textMuted }}>{p.h || 0}-H</span>
                                  {p.r  ? <span style={{ color:C.textMuted }}>{p.r}-R</span>   : null}
                                  {p.rbi ? <span style={{ color:C.textMuted }}>{p.rbi}-RBI</span> : null}
                                  <span style={{ fontWeight:"bold", color: parseInt(p.ab||0,10) > 0 && (parseInt(p.h||0,10)/parseInt(p.ab||0,10)) >= 0.300 ? C.win : C.textMuted }}>{gameAvg}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"6px" }}>Auto-Assign Preview</div>
                    <div>
                      {(function() {
                        var top = getTopPositions(info);
                        return top.map(function(item, idx) {
                          return <span key={item.pos} style={{ ...S.posTag(item.pos), opacity: idx === 0 ? 1 : idx === 1 ? 0.8 : 0.6 }}>{item.pos} {Math.round(item.sc)}</span>;
                        });
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Shared diamond position box renderer ─────────────────────────────
  // Used by both grid tab (Diamond view) and print tab (Defense > Diamond format).
  // inningFilter: null = show all innings; number = show only that inning (0-based).
  function renderPosBox(pos, label, inningFilter) {
    var innPlayers = [];
    for (var i = 0; i < innings; i++) {
      if (inningFilter !== null && inningFilter !== undefined && i !== inningFilter) { continue; }
      var found = "";
      for (var pi = 0; pi < roster.length; pi++) {
        if ((grid[roster[pi].name] || [])[i] === pos) { found = roster[pi].name; break; }
      }
      innPlayers.push({ inn: i + 1, name: found });
    }
    var pc = POS_COLORS[pos] || "#555";
    var isSingle = inningFilter !== null && inningFilter !== undefined;
    return (
      <div style={{ background:"rgba(255,255,255,0.97)", border:"2px solid " + pc, borderRadius:"7px",
        padding: isSingle ? "5px 8px" : "3px 5px", width:"100%", boxSizing:"border-box",
        boxShadow:"0 1px 5px rgba(0,0,0,0.14)", overflow:"hidden", minWidth:0 }}>
        <div style={{ fontSize:"9px", fontWeight:"bold", color:pc, letterSpacing:"0.05em",
          marginBottom: isSingle ? "4px" : "2px", textAlign:"center",
          borderBottom:"1px solid "+pc+"44", paddingBottom:"2px" }}>{label || pos}</div>
        {innPlayers.map(function(row) {
          return isSingle ? (
            <div key={row.inn} style={{ fontSize:"12px", fontWeight: row.name ? "bold" : "normal",
              color: row.name ? "#0f1f3d" : "#bbb", textAlign:"center", padding:"1px 0",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {row.name ? firstName(row.name) : "-"}
            </div>
          ) : (
            <div key={row.inn} style={{ display:"flex", gap:"2px", alignItems:"baseline", fontSize:"9.5px", lineHeight:"1.5", overflow:"hidden" }}>
              <span style={{ color:"#aaa", fontSize:"7.5px", minWidth:"8px", textAlign:"right", flexShrink:0 }}>{row.inn}</span>
              <span style={{ fontWeight: row.name ? "bold" : "normal", color: row.name ? "#0f1f3d" : "#ccc",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, flex:1 }}>{row.name ? firstName(row.name) : "-"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // FIELD SVG DIAMOND (shared by grid tab, print tab, share link)
  // ============================================================
  function renderFieldSVG(getPlayerFn, selectedInning, localInnArr) {
    var isSingle = selectedInning !== null && selectedInning !== undefined;
    var HDR_COLORS = {
      "LF":"#1a6e3a", "RF":"#1a6e3a",
      "LC":"#1a5580",
      "RC":"#5c2878",
      "SS":"#8a4a0a", "2B":"#8a4a0a",
      "3B":"#7a1a10", "P":"#7a1a10", "1B":"#7a1a10",
      "C":"#14406e"
    };
    var BOX_H = isSingle ? 54 : 82;
    var VB_H  = isSingle ? 640 : 680;
    var SVG_POSITIONS = isSingle ? [
      { pos:"LF", x:42,  y:175, w:112, h:BOX_H },
      { pos:"LC", x:170, y:138, w:112, h:BOX_H },
      { pos:"RC", x:398, y:138, w:112, h:BOX_H },
      { pos:"RF", x:526, y:175, w:112, h:BOX_H },
      { pos:"SS", x:190, y:300, w:112, h:BOX_H },
      { pos:"2B", x:378, y:300, w:112, h:BOX_H },
      { pos:"3B", x:148, y:415, w:112, h:BOX_H },
      { pos:"P",  x:284, y:405, w:112, h:BOX_H },
      { pos:"1B", x:420, y:415, w:112, h:BOX_H },
      { pos:"C",  x:284, y:555, w:112, h:BOX_H }
    ] : [
      { pos:"LF", x:42,  y:165, w:112, h:BOX_H },
      { pos:"LC", x:170, y:128, w:112, h:BOX_H },
      { pos:"RC", x:398, y:128, w:112, h:BOX_H },
      { pos:"RF", x:526, y:165, w:112, h:BOX_H },
      { pos:"SS", x:190, y:300, w:112, h:BOX_H },
      { pos:"2B", x:378, y:300, w:112, h:BOX_H },
      { pos:"3B", x:148, y:415, w:112, h:BOX_H },
      { pos:"P",  x:284, y:405, w:112, h:BOX_H },
      { pos:"1B", x:420, y:415, w:112, h:BOX_H },
      { pos:"C",  x:284, y:555, w:112, h:BOX_H }
    ];
    var benchPlayer = isSingle ? getPlayerFn("Bench", selectedInning) : "";
    return (
      <div style={{ position:"relative", width:"100%", maxWidth:"680px", margin:"0 auto", marginBottom:"10px" }}>
        <svg viewBox={"0 0 680 " + VB_H} width="100%" style={{ display:"block" }}>
          <rect x="0" y="0" width="680" height={VB_H} rx="8" fill="#2d7a3a"/>
          <path d="M 60 580 Q 340 30 620 580 Z" fill="#3a9147" fillOpacity="0.5" stroke="#3a9147" strokeOpacity="0.18" strokeWidth="1"/>
          <line x1="340" y1="565" x2="60" y2="580" stroke="white" strokeOpacity="0.3" strokeDasharray="6,4" strokeWidth="1.5"/>
          <line x1="340" y1="565" x2="620" y2="580" stroke="white" strokeOpacity="0.3" strokeDasharray="6,4" strokeWidth="1.5"/>
          <ellipse cx="340" cy="430" rx="170" ry="140" fill="#b5845a" fillOpacity="0.85"/>
          <polygon points="340,555 490,415 340,275 190,415" fill="#c49a6c" fillOpacity="0.6" stroke="#e8d5b0" strokeOpacity="0.8" strokeWidth="2"/>
          <circle cx="340" cy="435" r="18" fill="#c9a070" fillOpacity="0.9"/>
          {isSingle && (
            <g>
              <rect x="300" y="8" width="80" height="22" rx="11" fill="rgba(0,0,0,0.35)"/>
              <text x="340" y="23" textAnchor="middle" fontSize="10" fontWeight="600" fill="white" fontFamily="system-ui,sans-serif">
                {"Inning " + (selectedInning + 1)}
              </text>
            </g>
          )}
          {SVG_POSITIONS.map(function(slot) {
            var pc = POS_COLORS[slot.pos] || "#555555";
            var hc = HDR_COLORS[slot.pos] || "#2a2a2a";
            var cx = slot.x + slot.w / 2;
            var hdrFs = isSingle ? "10" : "8.5";
            return (
              <g key={slot.pos}>
                <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="6"
                  fill={pc} fillOpacity="0.22"
                  stroke={pc} strokeOpacity="0.55" strokeWidth="0.5"/>
                <rect x={slot.x} y={slot.y} width={slot.w} height="20" rx="6"
                  fill={hc} fillOpacity="0.88"/>
                <rect x={slot.x} y={slot.y + 10} width={slot.w} height="10" rx="0"
                  fill={hc} fillOpacity="0.88"/>
                <text x={cx} y={slot.y + 13} textAnchor="middle"
                  fontSize={hdrFs} fontWeight="700" fill="white" fillOpacity="0.92"
                  fontFamily="system-ui,sans-serif">
                  {slot.pos}
                </text>
                {isSingle ? (
                  <text x={cx} y={slot.y + 40} textAnchor="middle"
                    fontSize="14" fontWeight="700" fill="white"
                    fontFamily="system-ui,sans-serif">
                    {(function() { var n = getPlayerFn(slot.pos, selectedInning); return n ? firstName(n) : "-"; })()}
                  </text>
                ) : (
                  localInnArr.slice(0, Math.min(4, localInnArr.length)).map(function(ii, i) {
                    var n = getPlayerFn(slot.pos, ii);
                    return (
                      <text key={ii} x={cx} y={slot.y + 30 + (i * 11)} textAnchor="middle"
                        fontSize="7.5" fill="white" fillOpacity={n ? "1" : "0.4"}
                        fontFamily="system-ui,sans-serif">
                        {n ? firstName(n) : "-"}
                      </text>
                    );
                  })
                )}
              </g>
            );
          })}
          {isSingle && benchPlayer && (
            <g>
              <rect x="430" y="570" width="130" height="24" rx="12"
                fill="rgba(0,0,0,0.28)" stroke="white" strokeOpacity="0.15"
                strokeDasharray="3 2" strokeWidth="1"/>
              <text x="495" y="586" textAnchor="middle"
                fontSize="9" fill="rgba(255,255,255,0.7)"
                fontFamily="system-ui,sans-serif">
                {"Bench: " + firstName(benchPlayer)}
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  }

    // ============================================================
  // FIELD GRID TAB
  // ============================================================
  function renderGrid() {

    function setPos(player, inning, pos) {
      var ng = {};
      for (var k in grid) { ng[k] = grid[k].slice(); }
      ng[player] = ng[player] || [];
      while (ng[player].length <= inning) { ng[player].push(""); }
      ng[player][inning] = pos;
      persistGrid(ng);
      setLineupDirty(false);
    }

    function getCellViolations(player, inning) {
      var pos = (grid[player] || [])[inning] || "";
      var issues = [];
      var pGrid = grid[player] || [];
      if (pos === "Bench") {
        if (inning > 0 && pGrid[inning - 1] === "Bench") { issues.push("back-to-back bench"); }
        if (inning < innings - 1 && pGrid[inning + 1] === "Bench") { issues.push("back-to-back bench"); }
      }
      if (OUTFIELD.indexOf(pos) >= 0) {
        var cnt = 0;
        for (var i = 0; i < pGrid.length; i++) { if (pGrid[i] === pos) { cnt++; } }
        if (cnt > 1) { issues.push(pos + " repeated"); }
      }
      var benchInInning = 0;
      for (var pi = 0; pi < players.length; pi++) {
        if ((grid[players[pi]] || [])[inning] === "Bench") { benchInInning++; }
      }
      if (pos === "Bench" && benchInInning > 2) { issues.push("too many benched"); }
      return issues;
    }

    function autoFix() {
      var result = autoAssignWithRetryFallback(roster, innings);
      persistGrid(result.grid);
      setLineupDirty(false);
      track("auto_assign", {
        attempts: result.attempts || 1,
        warnings: (result.warnings || []).length,
        valid: result.isValid ? "yes" : "no",
        roster_size: roster.length,
        innings: innings
      });
      if (result.usedFallback || !result.isValid) {
        console.warn("[Lineup Engine] autoFix:", result.explain);
      }
    }

    var innArr = [];
    for (var i = 0; i < innings; i++) { innArr.push(i); }

    return (
      <div>
        {/* ── Finalized badge ───────────────────────────────── */}
        {lineupLocked ? (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px", borderRadius:"10px",
            background:"rgba(39,174,96,0.08)", border:"2px solid rgba(39,174,96,0.3)", marginBottom:"12px" }}>
            <span style={{ fontSize:"18px" }}>🔒</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:"bold", fontSize:"13px", color:C.win }}>Lineup Finalized</div>
              <div style={{ fontSize:"11px", color:C.textMuted }}>Editing is locked. Unlock to make changes.</div>
            </div>
            <button style={{ ...S.btn("ghost"), fontSize:"11px", color:C.win, border:"1px solid rgba(39,174,96,0.4)" }}
              onClick={function() { persistLineupLocked(false); }}>
              Unlock
            </button>
          </div>
        ) : null}

        <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap", alignItems:"center" }}>
          {!lineupLocked ? (
            <button style={S.btn("gold")} onClick={generateLineup}>Auto-Assign</button>
          ) : null}
          {!lineupLocked ? (
            <button style={S.btn(errorCount > 0 ? "danger" : "ghost")} onClick={function() {
              if (errorCount === 0) { alert("Lineup looks good! No issues found."); }
            }}>
              {errorCount > 0 ? errorCount + " Issues" : "Check OK"}
            </button>
          ) : null}
          {!lineupLocked && errorCount > 0 ? <button style={S.btn("primary")} onClick={autoFix}>Auto-Fix All</button> : null}
          {!lineupLocked && lastAutoGrid ? (
            <button style={S.btn("ghost")} onClick={function() {
              if (confirm("Revert to last auto-assigned lineup?")) {
                persistGrid(lastAutoGrid); setLineupDirty(false);
              }
            }}>Revert</button>
          ) : null}
          {!lineupLocked ? (
            <button style={S.btn("ghost")} onClick={function() {
              if (confirm("Clear all assignments?")) { persistGrid(initGrid(roster, innings)); setLineupDirty(true); }
            }}>Clear</button>
          ) : null}
          {/* Finalize button — only show when not locked and lineup looks good */}
          {!lineupLocked ? (
            <button
              style={{ ...S.btn("ghost"), color:C.win, border:"1px solid rgba(39,174,96,0.35)", marginLeft:"4px" }}
              onClick={function() {
                if (errorCount > 0) {
                  if (!confirm(errorCount + " issue(s) detected. Finalize anyway?")) { return; }
                }
                persistLineupLocked(true);
              }}>
              ✓ Finalize
            </button>
          ) : null}
          <div style={{ marginLeft:"auto", display:"flex", gap:"6px", alignItems:"center" }}>
            {/* Diamond toggle — works on top of whichever table view is active */}
            <button
              onClick={function() { setShowDiamond(!showDiamond); if (showDiamond) { setDiamondInning(null); } }}
              title={showDiamond ? "Hide diamond" : "Show diamond view"}
              style={{ padding:"5px 12px", borderRadius:"6px", border:"2px solid " + (showDiamond ? C.navy : "rgba(15,31,61,0.15)"),
                cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                background: showDiamond ? C.navy : "transparent",
                color: showDiamond ? "#fff" : C.textMuted }}>
              ◆ Diamond
            </button>
            {/* By Player / By Position table toggle */}
            <div style={{ display:"flex", gap:"4px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px" }}>
              {[["By Player","player"],["By Position","position"]].map(function(opt) {
                var active = gridView === opt[1];
                return (
                  <button key={opt[1]} style={{ padding:"5px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                    background: active ? C.white : "transparent",
                    color: active ? C.navy : C.textMuted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                    onClick={function(v) { return function() { setGridView(v); }; }(opt[1])}>
                    {opt[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {errorCount > 0 ? (
          <div style={{ ...S.card, borderLeft:"3px solid " + C.red, marginBottom:"14px" }}>
            <div style={{ fontWeight:"bold", color:C.red, fontSize:"12px", marginBottom:"8px" }}>
              {errorCount} Issue{errorCount !== 1 ? "s" : ""} Detected
            </div>
            {warnings.map(function(w, wi) {
              return (
                <div key={wi} style={{ padding:"6px 10px", borderRadius:"6px", fontSize:"11px", marginBottom:"4px",
                  background: w.type === "missing" ? "rgba(200,16,46,0.06)" : "rgba(200,144,46,0.08)",
                  color: w.type === "missing" ? C.red : "#9a6010",
                  border:"1px solid " + (w.type === "missing" ? "rgba(200,16,46,0.2)" : "rgba(200,144,46,0.2)") }}>
                  {w.msg}
                </div>
              );
            })}
          </div>
        ) : null}

        {showDiamond ? (
          <div style={{ borderTop:"2px solid rgba(15,31,61,0.1)", margin:"16px 0 12px",
            display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"10px", fontWeight:"bold", color:C.textMuted,
              textTransform:"uppercase", letterSpacing:"0.12em", whiteSpace:"nowrap" }}>
              {gridView === "player" ? "By Player" : "By Position"}
            </span>
            <div style={{ flex:1, height:"1px", background:"rgba(15,31,61,0.08)" }}/>
          </div>
        ) : null}

        {gridView === "player" ? (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ background:"#f5efe4" }}>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", position:"sticky", left:0, background:"#f5efe4", zIndex:1, minWidth:"90px" }}>Player</th>
                  {innArr.map(function(i) {
                    return <th key={i} style={{ padding:"8px 10px", textAlign:"center", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", minWidth:"72px" }}>Inn {i+1}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {roster.map(function(info, ri) {
                  var rowBg = ri % 2 === 0 ? "#fff" : "#faf8f5";
                  return (
                    <tr key={info.name}>
                      <td style={{ padding:"6px 12px", fontWeight:"bold", fontSize:"12px", position:"sticky", left:0, background:rowBg, zIndex:1, borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                        {firstName(info.name)}
                      </td>
                      {innArr.map(function(i) {
                        var pos = (grid[info.name] || [])[i] || "";
                        var viols = getCellViolations(info.name, i);
                        var hasViol = viols.length > 0;
                        return (
                          <td key={i} style={{ padding:"4px 5px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                            <select value={pos}
                              disabled={lineupLocked}
                              onChange={function(player, inning) { return function(e) { setPos(player, inning, e.target.value); }; }(info.name, i)}
                              style={{ width:"64px", padding:"4px 2px", borderRadius:"5px", fontSize:"11px", fontWeight:"bold",
                                background: pos ? (POS_COLORS[pos] + (lineupLocked ? "99" : "cc")) : "#f8f4ee",
                                color: pos ? "#fff" : "#9aaaaa",
                                border: hasViol ? "2px solid " + C.red : "1px solid " + (pos ? "rgba(255,255,255,0.3)" : "rgba(15,31,61,0.1)"),
                                cursor: lineupLocked ? "default" : "pointer", outline:"none", fontFamily:"inherit", textAlign:"center",
                                opacity: lineupLocked ? 0.8 : 1 }}>
                              <option value="">-</option>
                              {ALL_POSITIONS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ background:"#f5efe4" }}>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", position:"sticky", left:0, background:"#f5efe4", zIndex:1, minWidth:"90px" }}>Position</th>
                  {innArr.map(function(i) {
                    return <th key={i} style={{ padding:"8px 10px", textAlign:"center", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", minWidth:"90px" }}>Inn {i+1}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_POSITIONS.map(function(pos, ri) {
                  var rowBg = ri % 2 === 0 ? "#fff" : "#faf8f5";
                  var posColor = POS_COLORS[pos] || "#555";
                  return (
                    <tr key={pos}>
                      <td style={{ padding:"6px 12px", fontWeight:"bold", fontSize:"12px", position:"sticky", left:0, background:rowBg, zIndex:1, borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                        <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:"4px", background:posColor+"cc", color:"#fff", fontSize:"11px", fontWeight:"bold", minWidth:"36px", textAlign:"center" }}>{pos}</span>
                      </td>
                      {innArr.map(function(i) {
                        // Find which player is at this position this inning
                        var assignedPlayer = "";
                        for (var pi = 0; pi < players.length; pi++) {
                          if ((grid[players[pi]] || [])[i] === pos) { assignedPlayer = players[pi]; break; }
                        }
                        var isEmpty = !assignedPlayer && pos !== "Bench";
                        // For Bench: find all benched players
                        var benchedPlayers = [];
                        if (pos === "Bench") {
                          for (var bpi = 0; bpi < players.length; bpi++) {
                            if ((grid[players[bpi]] || [])[i] === "Bench") { benchedPlayers.push(players[bpi]); }
                          }
                        }
                        return (
                          <td key={i} style={{ padding:"5px 8px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)",
                            background: isEmpty ? "rgba(200,16,46,0.04)" : rowBg }}>
                            {pos === "Bench" ? (
                              <div>
                                {benchedPlayers.length > 0 ? benchedPlayers.map(function(bp) {
                                  return (
                                    <div key={bp} style={{ fontSize:"11px", color:C.navy, fontWeight:"bold", padding:"2px 6px", borderRadius:"4px", background:"rgba(15,31,61,0.1)", marginBottom:"2px", textAlign:"center" }}>{bp}</div>
                                  );
                                }) : <span style={{ fontSize:"11px", color:"rgba(15,31,61,0.2)" }}>-</span>}
                              </div>
                            ) : assignedPlayer ? (
                              <div style={{ fontSize:"12px", fontWeight:"bold", color:C.navy }}>{assignedPlayer}</div>
                            ) : (
                              <div style={{ fontSize:"11px", color:"rgba(200,16,46,0.5)", fontWeight:"bold" }}>-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showDiamond ? (
            (function() {
              // ── Diamond position layout ──────────────────────────────
              // Shown above the active table view (By Player or By Position).
              // posBox delegates to shared renderPosBox with grid-tab inning filter
              function posBox(pos, label) { return renderPosBox(pos, label, diamondInning); }
              function getGridPlayerFn(pos, inn) {
                for (var pi = 0; pi < roster.length; pi++) {
                  if ((grid[roster[pi].name] || [])[inn] === pos) { return roster[pi].name; }
                }
                return "";
              }

              // Bench strip — who is on bench each inning
              var benchByInning = [];
              for (var bi = 0; bi < innings; bi++) {
                var benched = roster.filter(function(r){ return (grid[r.name]||[])[bi] === "Bench"; }).map(function(r){ return r.name; });
                benchByInning.push(benched);
              }

              // Build position box data
              var posSlots = [
                { row:"of",  pos:"LF" },
                { row:"of",  pos:"LC" },
                { row:"of",  pos:"RC" },
                { row:"of",  pos:"RF" },
                { row:"if",  pos:"3B" },
                { row:"if",  pos:"SS" },
                { row:"if",  pos:"P"  },
                { row:"if",  pos:"2B" },
                { row:"if",  pos:"1B" },
                { row:"home",pos:"C"  }
              ];

              // Bench filtered to selected inning
              var benchDisplay = diamondInning !== null
                ? [benchByInning[diamondInning] || []]
                : benchByInning;
              var benchInnLabels = diamondInning !== null
                ? [diamondInning]
                : innArr;

              return (
                <div>

                  {/* ── Inning selector — single scrollable row ────── */}
                  <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center", marginBottom:"12px", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:"2px" }}>
                    <span style={{ fontSize:"9px", color:C.textMuted, fontWeight:"bold", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
                    <button
                      onClick={function() { setDiamondInning(null); }}
                      style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                        background: diamondInning === null ? C.navy : "rgba(15,31,61,0.07)",
                        color: diamondInning === null ? "#fff" : C.textMuted }}>
                      All
                    </button>
                    {innArr.map(function(i) {
                      var active = diamondInning === i;
                      return (
                        <button key={i}
                          onClick={function(idx) { return function() { setDiamondInning(idx); }; }(i)}
                          style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                            background: active ? C.red : "rgba(15,31,61,0.07)",
                            color: active ? "#fff" : C.textMuted }}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  {renderFieldSVG(getGridPlayerFn, diamondInning, innArr)}

                                    {/* ── Bench strip ───────────────────────────────── */}
                  <div style={{ borderTop:"2px solid rgba(15,31,61,0.15)", paddingTop:"10px" }}>
                    <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
                        <thead>
                          <tr style={{ background:"#f5efe4" }}>
                            {benchInnLabels.map(function(i) {
                              return <th key={i} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px", color:"#555", fontWeight:"bold", letterSpacing:"0.08em", borderBottom:"2px solid rgba(15,31,61,0.15)", minWidth:"52px" }}>Inn {i+1}</th>;
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {(function() {
                            var maxBench = 0;
                            for (var i = 0; i < benchDisplay.length; i++) {
                              if (benchDisplay[i].length > maxBench) maxBench = benchDisplay[i].length;
                            }
                            var rows = [];
                            for (var r = 0; r < maxBench; r++) {
                              rows.push(
                                <tr key={r}>
                                  {benchInnLabels.map(function(i, ci) {
                                    var pname = benchDisplay[ci][r] || "";
                                    return (
                                      <td key={i} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)", fontWeight:"bold", color: pname ? "#0f1f3d" : "#ccc" }}>
                                        {pname ? firstName(pname) : "-"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            }
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()
        ) : null}

        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginTop:"16px" }}>
          {innArr.map(function(i) {
            var assigned = {};
            for (var pi = 0; pi < players.length; pi++) {
              var pos = (grid[players[pi]] || [])[i];
              if (pos && pos !== "Bench") { assigned[pos] = true; }
            }
            var covered = 0;
            for (var fpi = 0; fpi < FIELD_POSITIONS.length; fpi++) { if (assigned[FIELD_POSITIONS[fpi]]) { covered++; } }
            var ok = covered === FIELD_POSITIONS.length;
            return (
              <div key={i} style={{ flex:1, minWidth:"80px", padding:"8px", borderRadius:"8px", textAlign:"center",
                background: ok ? "rgba(39,174,96,0.08)" : "rgba(200,16,46,0.06)",
                border:"1px solid " + (ok ? "rgba(39,174,96,0.2)" : "rgba(200,16,46,0.2)") }}>
                <div style={{ fontSize:"10px", color:C.textMuted, marginBottom:"2px" }}>Inn {i+1}</div>
                <div style={{ fontSize:"13px", fontWeight:"bold", color: ok ? C.win : C.red }}>{ok ? "OK" : covered + "/9"}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================
  // BATTING TAB
  // ============================================================
  function renderBatting() {

    function getBatScore(info) {
      if (!info) { return 0; }
      var bs = info.batSkills || [];
      var total = 0;
      for (var i = 0; i < bs.length; i++) {
        var b = BAT_SKILLS[bs[i]];
        if (b) { total += b.bonus; }
      }
      return total;
    }

    function suggestOrder() {
      var scored = roster.map(function(r) {
        return { name: r.name, score: getBatScore(r) };
      });
      scored.sort(function(a, b) { return b.score - a.score; });
      persistBatting(scored.map(function(x) { return x.name; }));
      track("suggest_batting_order", {
        has_stats: Object.keys(seasonStats || {}).length > 0 ? "yes" : "no"
      });
    }

    // Aggregate season stats per player across all played games
    var seasonStats = {};
    for (var si = 0; si < schedule.length; si++) {
      var game = schedule[si];
      if (!game.result || !game.battingPerf) { continue; }
      for (var pname in game.battingPerf) {
        var perf = game.battingPerf[pname];
        if (!seasonStats[pname]) {
          seasonStats[pname] = { ab:0, h:0, r:0, rbi:0, bb:0, games:0 };
        }
        seasonStats[pname].ab   += parseInt(perf.ab  || 0, 10);
        seasonStats[pname].h    += parseInt(perf.h   || 0, 10);
        seasonStats[pname].r    += parseInt(perf.r   || 0, 10);
        seasonStats[pname].rbi  += parseInt(perf.rbi || 0, 10);
        seasonStats[pname].bb   += parseInt(perf.bb  || 0, 10);
        seasonStats[pname].games++;
      }
    }
    var hasAnyStats = Object.keys(seasonStats).length > 0;

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", gap:"8px" }}>
          <div style={S.sectionTitle}>Batting Order</div>
          <button style={S.btn("gold")} onClick={suggestOrder}>Suggest Order</button>
        </div>

        {hasAnyStats ? (
          <div style={{ ...S.card, padding:"12px 14px", marginBottom:"14px", background:"rgba(15,31,61,0.03)", border:"1px solid rgba(15,31,61,0.1)" }}>
            <div style={{ fontSize:"10px", color:C.textMuted, marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.1em" }}>Season Batting Stats</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    {["Player","G","AB","H","AVG","R","RBI","BB"].map(function(h) {
                      return <th key={h} style={{ padding:"5px 8px", textAlign: h === "Player" ? "left" : "center", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", whiteSpace:"nowrap" }}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {battingOrder.map(function(name, idx) {
                    var st = seasonStats[name];
                    if (!st) { return null; }
                    var avg = st.ab > 0 ? (st.h / st.ab) : null;
                    var avgStr = avg !== null ? avg.toFixed(3).replace(/^0/, "") : "-";
                    var avgColor = avg !== null && avg >= 0.300 ? C.win : avg !== null && avg >= 0.200 ? "#d4a017" : C.text;
                    return (
                      <tr key={name} style={{ borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                        <td style={{ padding:"6px 8px", fontWeight:"bold" }}>{idx + 1}. {firstName(name)}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center", color:C.textMuted }}>{st.games}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center" }}>{st.ab}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center" }}>{st.h}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center", fontWeight:"bold", color:avgColor }}>{avgStr}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center" }}>{st.r}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center" }}>{st.rbi}</td>
                        <td style={{ padding:"6px 8px", textAlign:"center" }}>{st.bb}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"10px" }}>
          Drag to reorder. Enter game stats in the Schedule tab after each game.
        </div>

        <div>
          {battingOrder.map(function(name, idx) {
            var info = null;
            for (var ri = 0; ri < roster.length; ri++) { if (roster[ri].name === name) { info = roster[ri]; break; } }
            if (!info) { return null; }
            var bs = info.batSkills || [];
            var score = getBatScore(info);
            var scoreColor = score > 3 ? C.win : score > 0 ? "#d4a017" : score < 0 ? C.red : "#555";
            var fieldPositions = [];
            for (var ii = 0; ii < innings; ii++) {
              var pos = (grid[name] || [])[ii];
              if (pos && pos !== "Bench") { fieldPositions.push(pos); }
            }
            var st = seasonStats[name];

            return (
              <div key={name}
                draggable={true}
                onDragStart={function(n) { return function(e) { e.dataTransfer.effectAllowed="move"; setDragPlayer(n); }; }(name)}
                onDragOver={function(e) { e.preventDefault(); e.dataTransfer.dropEffect="move"; }}
                onDrop={function(n) { return function() { handleDrop(n); setDragPlayer(null); }; }(name)}
                onDragEnd={function() { setDragPlayer(null); }}
                onTouchMove={function(e) {
                  // Only handle if drag was activated via handle — prevents scroll interference
                  if (!window._bTouchDrag || !window._bTouchDrag.active) { return; }
                  e.preventDefault();
                  var td = window._bTouchDrag;
                  var y = e.touches[0].clientY;
                  var dy = y - td.startY;
                  // Require 8px threshold before moving to avoid accidental reorder on tap
                  if (Math.abs(dy) < 8) { return; }
                  var cards = e.currentTarget.parentNode.children;
                  var cardH = cards[0] ? cards[0].getBoundingClientRect().height + 6 : 60;
                  var moved = Math.round(dy / cardH);
                  var newIdx = Math.max(0, Math.min(battingOrder.length - 1, td.currentIdx + moved));
                  if (newIdx !== td.currentIdx) {
                    var order = battingOrder.slice();
                    var item = order.splice(td.currentIdx, 1)[0];
                    order.splice(newIdx, 0, item);
                    persistBatting(order);
                    window._bTouchDrag = { active:true, name:td.name, startY:td.startY, currentIdx:newIdx };
                    bumpTouchDrag(function(v) { return v + 1; });
                  }
                }}
                onTouchEnd={function() {
                  window._bTouchDrag = { active:false, name:null, startY:0, currentIdx:null };
                  bumpTouchDrag(function(v) { return v + 1; });
                }}
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", borderRadius:"8px", marginBottom:"6px",
                  background: (dragPlayer === name || (touchDrag.active && touchDrag.name === name)) ? "rgba(200,16,46,0.06)" : "#fff",
                  border:"1px solid " + ((dragPlayer === name || (touchDrag.active && touchDrag.name === name)) ? "rgba(200,16,46,0.4)" : "rgba(15,31,61,0.08)"),
                  cursor:"grab", touchAction:"auto", transition:"background 0.1s, border 0.1s",
                  transform: (touchDrag.active && touchDrag.name === name) ? "scale(1.02)" : "scale(1)" }}>

                <div
                  onTouchStart={function(n, i) { return function(e) {
                    // Drag only activates from the handle (number circle) — not the whole card
                    // This keeps normal scroll working anywhere else on the card
                    e.stopPropagation();
                    window._bTouchDrag = { active:true, name:n, startY:e.touches[0].clientY, currentIdx:i };
                    bumpTouchDrag(function(v) { return v + 1; });
                  }; }(name, idx)}
                  style={{ width:"26px", height:"26px", borderRadius:"50%", background:C.navy, color:"#fff", fontSize:"12px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, touchAction:"none", cursor:"grab", userSelect:"none" }}>
                  {idx + 1}
                </div>

                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:"bold", fontSize:"13px", marginBottom:"2px" }}>{firstName(name)}</div>
                  <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
                    {bs.map(function(key) {
                      var b = BAT_SKILLS[key]; if (!b) { return null; }
                      return <span key={key} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"8px", background:b.color+"22", color:b.color, fontWeight:"bold" }}>{b.label}</span>;
                    })}
                  </div>
                </div>

                {st ? (
                  <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                    {[
                      ["AVG", st.ab > 0 ? (st.h/st.ab).toFixed(3).replace(/^0/,"") : "-", st.ab > 0 && (st.h/st.ab) >= 0.300 ? C.win : st.ab > 0 && (st.h/st.ab) >= 0.200 ? "#d4a017" : C.textMuted],
                      ["RBI", st.rbi + "", C.textMuted],
                      ["BB",  st.bb  + "", C.textMuted]
                    ].map(function(row) {
                      return (
                        <div key={row[0]} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:"12px", fontWeight:"bold", color:row[2] }}>{row[1]}</div>
                          <div style={{ fontSize:"9px", color:"rgba(15,31,61,0.3)", letterSpacing:"0.06em" }}>{row[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize:"12px", fontWeight:"bold", color:scoreColor, minWidth:"28px", textAlign:"right" }}>
                    {score > 0 ? "+" + score : score !== 0 ? score : ""}
                  </div>
                )}

                <div style={{ display:"flex", gap:"2px", flexShrink:0 }}>
                  {fieldPositions.slice(0, 3).map(function(pos, fi) {
                    return <span key={fi} style={{ fontSize:"9px", padding:"1px 4px", borderRadius:"3px", background:POS_COLORS[pos]+"cc", color:"#fff", opacity: fi === 0 ? 1 : 0.6 }}>{pos}</span>;
                  })}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================
  // SCHEDULE TAB
  // ============================================================
  function renderSchedule() {
    var wins = 0; var losses = 0; var ties = 0;
    for (var si = 0; si < schedule.length; si++) {
      if (schedule[si].result === "W") { wins++; }
      else if (schedule[si].result === "L") { losses++; }
      else if (schedule[si].result === "T") { ties++; }
      // result "X" = canceled, excluded from record
    }

    var sorted = schedule.slice().sort(function(a, b) {
      return new Date(a.date + "T12:00:00") - new Date(b.date + "T12:00:00");
    });

    function startEdit(game) {
      var g = {};
      for (var k in game) { g[k] = game[k]; }
      if (!g.battingPerf) { g.battingPerf = {}; }
      setNewGame(g);
      setEditingGame(game);
      setShowGameForm(true);
    }

    function buildShareUrl(game) {
      var payload = {
        team: activeTeam ? activeTeam.name + (activeTeam.ageGroup ? " " + activeTeam.ageGroup : "") : "Lineup",
        game: game,
        grid: grid,
        batting: battingOrder,
        roster: roster.map(function(r) { return r.name; })
      };
      var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      return window.location.href.split("?")[0] + "?share=" + encoded;
    }

    function handleShareGame(game) {
      var url = buildShareUrl(game);
      if (navigator.share) {
        navigator.share({ title:"Lineup - " + game.opponent, url:url });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() { alert("Lineup link copied!"); });
      } else {
        setShareGame({ url:url, game:game });
        setShowShare(true);
      }
    }

    return (
      <div>
        {wins + losses + ties > 0 ? (
          <div style={{ display:"flex", gap:"10px", padding:"12px 16px", borderRadius:"10px", background:"linear-gradient(135deg,#0f1f3d,#1a3260)", marginBottom:"14px" }}>
            {[["W", wins, C.win], ["L", losses, C.red], ["T", ties, "#d4a017"]].map(function(row) {
              return (
                <div key={row[0]} style={{ textAlign:"center", flex:1 }}>
                  <div style={{ fontSize:"22px", fontWeight:"bold", color:row[2] }}>{row[1]}</div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.12em" }}>{row[0]}</div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap" }}>
          <button style={S.btn("primary")} onClick={function() {
            setNewGame({ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:{} });
            setEditingGame(null);
            setShowGameForm(true);
            setImportMode(null);
          }}>+ Add Game</button>
          <button style={S.btn("ghost")} onClick={function() {
            setImportMode(importMode ? null : "choose");
            setShowGameForm(false);
          }}>{importMode ? "Cancel Import" : "Import Schedule"}</button>
        </div>

        {importMode === "choose" ? (
          <div style={{ ...S.card, marginBottom:"14px" }}>
            <div style={S.sectionTitle}>How do you have your schedule?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {[
                ["photo",  "Take a Photo or Choose Screenshot", "Point your camera at a printed schedule, or pick a screenshot from your phone"],
                ["text",   "Paste from Email or Website",       "Copy schedule text from an email, GroupMe, or website and paste it here"],
                ["manual", "Type it in Manually",               "Enter games one at a time - date, time, opponent, field"]
              ].map(function(row) {
                return (
                  <div key={row[0]} onClick={function(m) { return function() {
                    if (m === "photo")  { setImportMode("image"); }
                    else if (m === "manual") { setShowGameForm(true); setImportMode(null); }
                    else { setImportMode(m); }
                  }; }(row[0])}
                    style={{ padding:"16px 18px", borderRadius:"10px", border:"2px solid rgba(15,31,61,0.1)",
                      cursor:"pointer", background:"rgba(15,31,61,0.02)", display:"flex", alignItems:"center", gap:"14px" }}>
                    <div style={{ fontSize:"26px", flexShrink:0 }}>
                      {row[0] === "photo" ? "Cam" : row[0] === "text" ? "Txt" : "Add"}
                    </div>
                    <div>
                      <div style={{ fontWeight:"bold", fontSize:"14px", color:C.navy, marginBottom:"3px" }}>{row[1]}</div>
                      <div style={{ fontSize:"12px", color:C.textMuted, lineHeight:"1.4" }}>{row[2]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {importMode === "image" ? (
          <div style={{ ...S.card, marginBottom:"14px" }}>
            <div style={S.sectionTitle}>Import from Photo</div>
            <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"14px" }}>
              Take a photo of your printed schedule, or choose a screenshot from your camera roll.
            </div>

            {!importState.loading && !(importState.preview && importState.preview.length > 0) ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

                <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                  padding:"18px", borderRadius:"12px", cursor:"pointer", textAlign:"center",
                  background:"linear-gradient(135deg,#c8102e,#9b0c22)", color:"#fff",
                  fontWeight:"bold", fontSize:"15px", fontFamily:"inherit", boxShadow:"0 3px 12px rgba(200,16,46,0.35)" }}>
                  Take Photo / Choose from Gallery
                  <input type="file" accept="image/*" capture="environment"
                    onChange={function(e) {
                      var file = e.target.files && e.target.files[0];
                      if (!file) { return; }
                      var reader = new FileReader();
                      reader.onload = function(ev) {
                        var b64 = ev.target.result.split(",")[1];
                        parseScheduleImage(b64, file.type);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                    style={{ display:"none" }} />
                </label>

                <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                  padding:"16px", borderRadius:"12px", cursor:"pointer", textAlign:"center",
                  background:"rgba(15,31,61,0.06)", color:C.navy,
                  fontWeight:"bold", fontSize:"14px", fontFamily:"inherit",
                  border:"2px dashed rgba(15,31,61,0.2)" }}>
                  Choose Existing Photo / Screenshot
                  <input type="file" accept="image/*"
                    onChange={function(e) {
                      var file = e.target.files && e.target.files[0];
                      if (!file) { return; }
                      var reader = new FileReader();
                      reader.onload = function(ev) {
                        var b64 = ev.target.result.split(",")[1];
                        parseScheduleImage(b64, file.type);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                    style={{ display:"none" }} />
                </label>

                <div style={{ textAlign:"center", fontSize:"11px", color:C.textMuted, padding:"4px 0" }}>
                  Works with printed schedules, screenshots, photos of a whiteboard, or any image with game dates
                </div>
              </div>
            ) : null}

            {importState.loading ? (
              <div style={{ padding:"24px", borderRadius:"10px", background:"rgba(15,31,61,0.04)", textAlign:"center" }}>
                <div style={{ fontSize:"22px", marginBottom:"8px" }}>AI</div>
                <div style={{ fontWeight:"bold", fontSize:"13px", color:C.navy, marginBottom:"4px" }}>Reading your schedule...</div>
                <div style={{ fontSize:"11px", color:C.textMuted }}>AI is extracting game dates, times, and opponents</div>
              </div>
            ) : null}

            {importState.error ? (
              <div style={{ color:C.red, fontSize:"12px", padding:"10px 12px", background:"rgba(200,16,46,0.06)", borderRadius:"8px", marginBottom:"8px" }}>
                {importState.error} - Try the text import option instead.
              </div>
            ) : null}

            {importState.preview && importState.preview.length > 0 ? (
              <div>
                <div style={{ fontSize:"13px", color:C.win, marginBottom:"10px", fontWeight:"bold" }}>
                  Found {importState.preview.length} game{importState.preview.length !== 1 ? "s" : ""}
                </div>
                {importState.preview.map(function(g, gi) {
                  return (
                    <div key={gi} style={{ fontSize:"12px", padding:"8px 12px", background:"rgba(39,174,96,0.06)", borderRadius:"8px", marginBottom:"5px", border:"1px solid rgba(39,174,96,0.2)" }}>
                      <div style={{ fontWeight:"bold" }}>{g.opponent}</div>
                      <div style={{ color:C.textMuted, fontSize:"11px" }}>
                        {g.date} {g.time ? "at " + g.time : ""} {g.location ? "| " + g.location : ""}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                  <button style={{ ...S.btn("primary"), flex:1, padding:"12px" }} onClick={confirmImport}>
                    Add {importState.preview.length} Games
                  </button>
                  <button style={S.btn("ghost")} onClick={function() {
                    setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] });
                  }}>Retry</button>
                </div>
              </div>
            ) : null}

            <button style={{ ...S.btn("ghost"), marginTop:"12px", width:"100%", padding:"10px" }}
              onClick={function() { setImportMode("choose"); setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] }); }}>
              Back
            </button>
          </div>
        ) : null}

        {importMode === "text" ? (
          <div style={{ ...S.card, marginBottom:"14px" }}>
            <div style={S.sectionTitle}>Paste Schedule Text</div>
            <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"10px" }}>
              Copy the schedule from an email, GroupMe message, or website and paste it below. Any format works.
            </div>
            <textarea rows={7} value={importState.text}
              onChange={function(e) { var next = {}; for (var k in importState) { next[k]=importState[k]; } next.text = e.target.value; setImportState(next); }}
              placeholder={"Paste your schedule here..."}
              style={{ ...S.input, marginBottom:"12px", resize:"vertical", lineHeight:"1.6", fontSize:"13px", minHeight:"120px" }} />
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <button style={{ ...S.btn("primary"), flex:1, padding:"12px", fontSize:"13px" }}
                onClick={function() { parseScheduleText(importState.text); }}
                disabled={!importState.text.trim()}>
                {importState.loading ? "Reading schedule..." : "Read Schedule with AI"}
              </button>
              <button style={S.btn("ghost")} onClick={function() { setImportMode("choose"); setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] }); }}>Back</button>
            </div>
            {importState.error ? <div style={{ color:C.red, fontSize:"12px", marginTop:"10px", padding:"8px 12px", background:"rgba(200,16,46,0.06)", borderRadius:"6px" }}>{importState.error}</div> : null}
            {importState.preview && importState.preview.length > 0 ? (
              <div style={{ marginTop:"14px" }}>
                <div style={{ fontSize:"13px", color:C.win, marginBottom:"10px", fontWeight:"bold" }}>
                  Found {importState.preview.length} game{importState.preview.length !== 1 ? "s" : ""}
                </div>
                {importState.preview.map(function(g, gi) {
                  return (
                    <div key={gi} style={{ fontSize:"12px", padding:"8px 12px", background:"rgba(39,174,96,0.06)", borderRadius:"8px", marginBottom:"5px", border:"1px solid rgba(39,174,96,0.2)" }}>
                      <div style={{ fontWeight:"bold" }}>{g.opponent}</div>
                      <div style={{ color:C.textMuted, fontSize:"11px" }}>{g.date} {g.time ? "at " + g.time : ""} {g.location ? "| " + g.location : ""}</div>
                    </div>
                  );
                })}
                <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                  <button style={{ ...S.btn("primary"), flex:1, padding:"12px" }} onClick={confirmImport}>
                    Add {importState.preview.length} Games to Schedule
                  </button>
                  <button style={S.btn("ghost")} onClick={function() { setImportMode(null); setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] }); }}>Cancel</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {showGameForm ? (
          <div style={{ ...S.card, marginBottom:"14px", borderLeft:"3px solid " + C.red }}>
            <div style={{ fontWeight:"bold", fontSize:"14px", marginBottom:"14px" }}>
              {editingGame ? "Edit Game" : "Add New Game"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
              {[
                ["Opponent *", "opponent", "text"],
                ["Date *", "date", "date"],
                ["Time", "time", "text"],
                ["Location", "location", "text"]
              ].map(function(row) {
                return (
                  <div key={row[1]}>
                    <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>{row[0]}</div>
                    <input type={row[2]} value={newGame[row[1]] || ""} placeholder={row[0]}
                      maxLength={row[2] === "text" ? 50 : undefined}
                      onChange={function(field) { return function(e) { var g = {}; for (var k in newGame) { g[k]=newGame[k]; } g[field]=e.target.value; setNewGame(g); }; }(row[1])}
                      style={S.input} />
                  </div>
                );
              })}
            </div>
            <div style={{ marginBottom:"10px" }}>
              <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"6px" }}>Result</div>
              <div style={{ display:"flex", gap:"6px" }}>
                {["W","L","T",""].map(function(r) {
                  var label = r === "" ? "Pending" : r;
                  var active = newGame.result === r;
                  return (
                    <button key={label} onClick={function(rv) { return function() { var g={}; for(var k in newGame){g[k]=newGame[k];} g.result=rv; setNewGame(g); }; }(r)}
                      style={{ padding:"6px 14px", borderRadius:"6px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"12px", fontFamily:"inherit",
                        background: active ? (r === "W" ? C.win : r === "L" ? C.red : r === "T" ? "#d4a017" : C.navy) : "rgba(15,31,61,0.06)",
                        color: active ? "#fff" : C.textMuted }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {newGame.result && newGame.result !== "" ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                {[["Our Score","ourScore"],["Their Score","theirScore"]].map(function(row) {
                  return (
                    <div key={row[1]}>
                      <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>{row[0]}</div>
                      <input type="number" min="0" max="99" value={newGame[row[1]] || ""}
                        onChange={function(field) { return function(e) { var g={}; for(var k in newGame){g[k]=newGame[k];} g[field]=e.target.value; setNewGame(g); }; }(row[1])}
                        style={{ ...S.input, width:"80px" }} />
                    </div>
                  );
                })}
              </div>
            ) : null}
            {newGame.result && newGame.result !== "" && roster.length > 0 ? (
              <div style={{ marginBottom:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                  <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                    Batting Stats (optional)
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <label style={{ ...S.btn("ghost"), display:"inline-block", cursor:"pointer", fontSize:"10px", padding:"4px 10px" }}>
                      Import from Photo/PDF
                      <input type="file" accept="image/*,application/pdf"
                        onChange={function(e) {
                          var file = e.target.files && e.target.files[0];
                          if (!file) { return; }
                          setResultImport({ gameId: editingGame ? editingGame.id : null, loading:true, error:"" });
                          var reader = new FileReader();
                          reader.onload = function(ev) {
                            var b64 = ev.target.result.split(",")[1];
                            var sType = file.type === "application/pdf" ? "pdf" : "image";
                            parseGameResult(sType, b64, file.type)
                              .then(function(parsed) {
                                track(sType === "text" ? "import_result_text" : "import_result_photo", {});
                                var g = {}; for (var k in newGame) { g[k] = newGame[k]; }
                                if (parsed.result)     { g.result     = parsed.result; }
                                if (parsed.ourScore)   { g.ourScore   = parsed.ourScore; }
                                if (parsed.theirScore) { g.theirScore = parsed.theirScore; }
                                if (parsed.battingPerf) {
                                  var bp = {}; for (var k2 in (g.battingPerf || {})) { bp[k2] = g.battingPerf[k2]; }
                                  for (var pn in parsed.battingPerf) { bp[pn] = parsed.battingPerf[pn]; }
                                  g.battingPerf = bp;
                                }
                                setNewGame(g);
                                setResultImport({ gameId: null, loading:false, error:"" });
                              })
                              .catch(function() {
                                setResultImport({ gameId:null, loading:false, error:"Could not read file. Try entering stats manually." });
                              });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                        style={{ display:"none" }} />
                    </label>
                    <label style={{ ...S.btn("ghost"), display:"inline-block", cursor:"pointer", fontSize:"10px", padding:"4px 10px" }}>
                      Camera / Gallery
                      <input type="file" accept="image/*" capture="environment"
                        onChange={function(e) {
                          var file = e.target.files && e.target.files[0];
                          if (!file) { return; }
                          setResultImport({ gameId: editingGame ? editingGame.id : null, loading:true, error:"" });
                          var reader = new FileReader();
                          reader.onload = function(ev) {
                            var b64 = ev.target.result.split(",")[1];
                            parseGameResult("image", b64, file.type)
                              .then(function(parsed) {
                                track("import_result_photo", {});
                                var g = {}; for (var k in newGame) { g[k] = newGame[k]; }
                                if (parsed.result)     { g.result     = parsed.result; }
                                if (parsed.ourScore)   { g.ourScore   = parsed.ourScore; }
                                if (parsed.theirScore) { g.theirScore = parsed.theirScore; }
                                if (parsed.battingPerf) {
                                  var bp = {}; for (var k2 in (g.battingPerf || {})) { bp[k2] = g.battingPerf[k2]; }
                                  for (var pn in parsed.battingPerf) { bp[pn] = parsed.battingPerf[pn]; }
                                  g.battingPerf = bp;
                                }
                                setNewGame(g);
                                setResultImport({ gameId:null, loading:false, error:"" });
                              })
                              .catch(function() {
                                setResultImport({ gameId:null, loading:false, error:"Could not read photo. Try entering stats manually." });
                              });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                        style={{ display:"none" }} />
                    </label>
                  </div>
                </div>
                {resultImport.loading ? (
                  <div style={{ padding:"10px 12px", borderRadius:"8px", background:"rgba(15,31,61,0.04)", color:C.textMuted, fontSize:"12px", marginBottom:"8px", textAlign:"center" }}>
                    Reading stats with AI...
                  </div>
                ) : null}
                {resultImport.error ? (
                  <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(200,16,46,0.06)", color:C.red, fontSize:"11px", marginBottom:"8px" }}>
                    {resultImport.error}
                  </div>
                ) : null}
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                    <thead>
                      <tr style={{ background:"#f5efe4" }}>
                        {["Player","AB","H","R","RBI","Avg"].map(function(h) {
                          return <th key={h} style={{ padding:"5px 8px", textAlign: h==="Player" ? "left" : "center", fontSize:"10px", color:C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"1px solid rgba(15,31,61,0.1)", whiteSpace:"nowrap" }}>{h}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map(function(info) {
                        var perf = (newGame.battingPerf && newGame.battingPerf[info.name]) || {};
                        function updatePerf(field) {
                          return function(e) {
                            var bp = {};
                            for (var k in (newGame.battingPerf || {})) { bp[k] = newGame.battingPerf[k]; }
                            if (!bp[info.name]) { bp[info.name] = {}; }
                            var p = {}; for (var k2 in bp[info.name]) { p[k2] = bp[info.name][k2]; }
                            p[field] = e.target.value;
                            bp[info.name] = p;
                            var g = {}; for (var gk in newGame) { g[gk] = newGame[gk]; }
                            g.battingPerf = bp;
                            setNewGame(g);
                          };
                        }
                        var cellStyle = { padding:"2px 4px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" };
                        var inputStyle = { width:"40px", padding:"3px 4px", borderRadius:"4px", border:"1px solid rgba(15,31,61,0.12)", textAlign:"center", fontSize:"12px", fontFamily:"inherit", background:"#f8f4ee" };
                        return (
                          <tr key={info.name}>
                            <td style={{ padding:"5px 8px", fontWeight:"bold", fontSize:"12px", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>{firstName(info.name)}</td>
                            {["ab","h","r","rbi"].map(function(field) {
                              return (
                                <td key={field} style={cellStyle}>
                                  <input type="number" min="0" max="20" value={perf[field] || ""}
                                    onChange={updatePerf(field)}
                                    style={inputStyle} />
                                </td>
                              );
                            })}
                            <td style={cellStyle}>
                              <span style={{ fontSize:"12px", fontWeight:"bold", color: perf.ab > 0 ? (perf.h/perf.ab >= 0.300 ? C.win : perf.h/perf.ab >= 0.200 ? "#d4a017" : C.text) : C.textMuted }}>
                                {perf.ab > 0 ? (perf.h / perf.ab).toFixed(3).replace(/^0/, "") : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <div style={{ display:"flex", gap:"8px" }}>
              <button style={S.btn("primary")} onClick={saveGameForm} disabled={!newGame.date || !newGame.opponent}>
                {editingGame ? "Save Changes" : "Add Game"}
              </button>
              <button style={S.btn("ghost")} onClick={function() { setShowGameForm(false); setEditingGame(null); }}>Cancel</button>
            </div>
          </div>
        ) : null}

        <div>
          {sorted.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px", color:C.textMuted, fontSize:"13px" }}>
              No games yet. Add your schedule to get started.
            </div>
          ) : null}
          {sorted.map(function(game) {
            var isCanceled = game.result === "X";
            var isPlayed = !!game.result && !isCanceled;
            var resultColor = game.result === "W" ? C.win : game.result === "L" ? C.red : game.result === "T" ? "#d4a017" : "#888";
            var cancelColor = C.canceled;
            return (
              <div key={game.id} style={{ ...S.card, borderLeft:"3px solid " + (isCanceled ? cancelColor : isPlayed ? resultColor : C.red), padding:"14px 16px", opacity: isCanceled ? 0.72 : 1 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px", flexWrap:"wrap" }}>
                      <div style={{ fontWeight:"bold", fontSize:"15px" }}>{game.opponent}</div>
                      {isCanceled ? (
                        <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"10px", fontWeight:"bold", background:cancelColor+"22", color:cancelColor, letterSpacing:"0.05em" }}>
                          Canceled
                        </span>
                      ) : isPlayed && game.result ? (
                        <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"10px", fontWeight:"bold", background:resultColor+"22", color:resultColor }}>
                          {game.result} {game.ourScore ? game.ourScore + "-" + game.theirScore : ""}
                        </span>
                      ) : (function() {
                        var today2 = new Date(); today2.setHours(0,0,0,0);
                        var gd = game.date ? new Date(game.date + "T12:00:00") : null;
                        var isPast2 = gd && gd < today2;
                        if (isPast2) {
                          return (
                            <span style={{ display:"inline-flex", gap:"3px", alignItems:"center" }}>
                              {["W","L","T"].map(function(r) {
                                var rc = r==="W"?C.win:r==="L"?C.red:"#d4a017";
                                return (
                                  <button key={r} style={{ padding:"2px 10px", borderRadius:"8px", border:"1px solid "+rc+"66", cursor:"pointer", fontWeight:"bold", fontSize:"11px", fontFamily:"inherit", background:rc+"11", color:rc }}
                                    onClick={function(rv) { return function() {
                                      var g2 = {}; for (var k in game) { g2[k] = game[k]; }
                                      g2.result = rv;
                                      persistSchedule(schedule.map(function(x) { return x.id === game.id ? g2 : x; }));
                                      setInlineScoreGame(game.id);
                                    }; }(r)}>{r}</button>
                                );
                              })}
                              <button style={{ padding:"2px 8px", borderRadius:"8px", border:"1px solid "+cancelColor+"66", cursor:"pointer", fontWeight:"bold", fontSize:"11px", fontFamily:"inherit", background:cancelColor+"11", color:cancelColor }}
                                onClick={function() {
                                  var g2 = {}; for (var k in game) { g2[k] = game[k]; }
                                  g2.result = "X";
                                  persistSchedule(schedule.map(function(x) { return x.id === game.id ? g2 : x; }));
                                }}>Rain</button>
                            </span>
                          );
                        }
                        return <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:"rgba(200,16,46,0.08)", color:C.red, letterSpacing:"0.08em", textTransform:"uppercase" }}>Upcoming</span>;
                      })()}
                    </div>
                    {inlineScoreGame === game.id && !isCanceled ? (
                      <div style={{ display:"flex", gap:"6px", alignItems:"center", marginTop:"6px", flexWrap:"wrap" }}>
                        <input type="number" min="0" max="99" placeholder="Us"
                          defaultValue={game.ourScore || ""}
                          onChange={function(gid) { return function(e) {
                            var g2={}; for(var k in game){g2[k]=game[k];} g2.ourScore=e.target.value;
                            persistSchedule(schedule.map(function(x){return x.id===gid?g2:x;}));
                          }; }(game.id)}
                          style={{ width:"56px", padding:"4px 6px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", textAlign:"center" }} />
                        <span style={{ fontSize:"12px", color:C.textMuted }}>-</span>
                        <input type="number" min="0" max="99" placeholder="Them"
                          defaultValue={game.theirScore || ""}
                          onChange={function(gid) { return function(e) {
                            var g2={}; for(var k in game){g2[k]=game[k];} g2.theirScore=e.target.value;
                            persistSchedule(schedule.map(function(x){return x.id===gid?g2:x;}));
                          }; }(game.id)}
                          style={{ width:"56px", padding:"4px 6px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", textAlign:"center" }} />
                        <button style={{ ...S.btn("ghost"), fontSize:"11px", padding:"4px 10px" }}
                          onClick={function() { setInlineScoreGame(null); }}>Done</button>
                      </div>
                    ) : null}
                    <div style={{ fontSize:"12px", color:C.textMuted, display:"flex", gap:"12px", flexWrap:"wrap" }}>
                      {game.date ? <span>{new Date(game.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}</span> : null}
                      {game.time ? <span>{game.time}</span> : null}
                      {game.location ? <span>{game.location}</span> : null}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    {(function() {
                      var today = new Date(); today.setHours(0,0,0,0);
                      var gameDate = game.date ? new Date(game.date + "T12:00:00") : null;
                      var isPast = gameDate && gameDate < today;
                      if (isCanceled) {
                        return (
                          <button style={{ ...S.btn("ghost"), color:cancelColor, fontSize:"11px" }}
                            onClick={function() {
                              var g2 = {}; for (var k in game) { g2[k] = game[k]; }
                              g2.result = "";
                              persistSchedule(schedule.map(function(x) { return x.id === game.id ? g2 : x; }));
                            }}>Uncancel</button>
                        );
                      }
                      if (!isPlayed && isPast) {
                        return <button style={S.btn("primary")} onClick={function(g) { return function() {
                          var gCopy = {}; for (var k in g) { gCopy[k] = g[k]; }
                          if (!gCopy.battingPerf) { gCopy.battingPerf = {}; }
                          setNewGame(gCopy);
                          setEditingGame(g);
                          setShowGameForm(true);
                          setResultImport({ gameId:g.id, loading:false, error:"" });
                        }; }(game)}>Add Result</button>;
                      }
                      return null;
                    })()}
                    <button style={S.btn("ghost")} onClick={function() { handleShareGame(game); }}>Share</button>
                    <button style={S.btn("ghost")} onClick={function(g) { return function() { startEdit(g); }; }(game)}>Edit</button>
                    <button style={{ ...S.btn("ghost"), color:C.red }} onClick={function(id) { return function() { if (confirm("Delete game?")) { deleteGame(id); } }; }(game.id)}>Del</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showShare ? (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"20px" }}>
            <div style={{ ...S.card, maxWidth:"420px", width:"100%", padding:"24px" }}>
              <div style={{ fontWeight:"bold", fontSize:"15px", marginBottom:"12px" }}>Share Lineup</div>
              <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"8px" }}>View-only link for coaches and parents:</div>
              <div style={{ padding:"10px", background:"#f8f4ee", borderRadius:"6px", fontSize:"11px", wordBreak:"break-all", marginBottom:"12px", border:"1px solid rgba(15,31,61,0.08)" }}>
                {shareGame ? shareGame.url : ""}
              </div>
              <div style={{ display:"flex", gap:"8px" }}>
                <button style={S.btn("primary")} onClick={function() {
                  var url = shareGame ? shareGame.url : "";
                  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url); }
                  setShowShare(false);
                }}>Copy Link</button>
                <button style={S.btn("ghost")} onClick={function() { setShowShare(false); setShareGame(null); }}>Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ============================================================
  // FEEDBACK TAB
  // ============================================================
  function renderFeedback() {
    var fbCats = ["General","Lineup Engine","Batting Order","Schedule","Sharing & Print","Performance","Other"];
    var fbChangePills = ["Fix a bug","Improve an existing feature","Add something new","Make it faster","Simplify the UI"];
    var bugLocs = ["Roster","Field Grid","Batting","Schedule","Print / PDF","Home Screen","Other"];
    var bugSevs = ["Blocks me completely","Annoying but I can work around it","Minor / cosmetic"];

    var allSubs = [];
    try {
      var fbSubs = loadJSON("feedback:submissions", []);
      var bugSubs = loadJSON("feedback:bugs", []);
      var combined = fbSubs.concat(bugSubs);
      combined.sort(function(a, b) { return b.timestamp - a.timestamp; });
      allSubs = combined.slice(0, 5);
    } catch(e) {}

    return (
      <div>

        {/* ── Section 1: General Feedback ───────────────────── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Share Feedback</div>
          <div style={{ color:C.textMuted, fontSize:"12px", marginBottom:"14px" }}>
            Help us improve the app. Tell us what’s working and what isn’t.
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Category</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {fbCats.map(function(cat) {
              var active = fbCategory === cat;
              return (
                <span key={cat} style={S.badge(C.navy, active)}
                  onClick={function(c) { return function() { setFbCategory(c); }; }(cat)}>
                  {cat}
                </span>
              );
            })}
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>Your Feedback</div>
          <textarea
            placeholder="Describe your feedback, suggestion, or idea..."
            value={fbBody}
            onChange={function(e) { setFbBody(e.target.value); }}
            style={{ ...S.input, minHeight:"120px", resize:"vertical", lineHeight:"1.5", display:"block", marginBottom:"12px" }}
          />

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>What would you like to see changed?</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {fbChangePills.map(function(ct) {
              var active = fbChangeTypes.indexOf(ct) >= 0;
              return (
                <span key={ct} style={S.badge("#27ae60", active)}
                  onClick={function(cv) { return function() {
                    var idx = fbChangeTypes.indexOf(cv);
                    var next = fbChangeTypes.slice();
                    if (idx >= 0) { next.splice(idx, 1); } else { next.push(cv); }
                    setFbChangeTypes(next);
                  }; }(ct)}>
                  {ct}
                </span>
              );
            })}
          </div>

          <button style={S.btn("primary")} onClick={submitFeedback}>Send Feedback</button>
          {fbConfirm ? (
            <div style={{ marginTop:"10px", color:"#27ae60", fontSize:"12px", fontWeight:"bold" }}>{fbConfirm}</div>
          ) : null}
        </div>

        {/* ── Section 2: Report a Bug ──────────────────────── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Report an Issue</div>
          <div style={{ color:C.textMuted, fontSize:"12px", marginBottom:"14px" }}>
            Something not working right? Tell us what happened.
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Where did this happen?</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {bugLocs.map(function(loc) {
              var active = bugLocation === loc;
              return (
                <span key={loc} style={S.badge(C.navy, active)}
                  onClick={function(l) { return function() { setBugLocation(l); }; }(loc)}>
                  {loc}
                </span>
              );
            })}
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>What happened?</div>
          <textarea
            placeholder="Describe what happened and what you expected instead..."
            value={bugBody}
            onChange={function(e) { setBugBody(e.target.value); }}
            style={{ ...S.input, minHeight:"100px", resize:"vertical", lineHeight:"1.5", display:"block", marginBottom:"12px" }}
          />

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Severity</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {bugSevs.map(function(sev) {
              var active = bugSeverity === sev;
              var sevColor = sev === "Blocks me completely" ? C.red : sev === "Annoying but I can work around it" ? "#d4a017" : "#6b7280";
              return (
                <span key={sev} style={S.badge(sevColor, active)}
                  onClick={function(s) { return function() { setBugSeverity(s); }; }(sev)}>
                  {sev}
                </span>
              );
            })}
          </div>

          <button style={S.btn("primary")} onClick={submitBug}>Report Issue</button>
          {bugConfirm ? (
            <div style={{ marginTop:"10px", color:"#27ae60", fontSize:"12px", fontWeight:"bold" }}>{bugConfirm}</div>
          ) : null}
        </div>

        {/* ── Submitted Feedback History ─────────────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
            onClick={function() { setFbHistoryOpen(!fbHistoryOpen); }}>
            <div style={{ fontSize:"11px", fontWeight:"bold", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>
              {"Submitted Feedback" + (allSubs.length > 0 ? " (" + allSubs.length + " recent)" : "")}
            </div>
            <span style={{ fontSize:"11px", color:C.textMuted }}>{fbHistoryOpen ? "▲" : "▼"}</span>
          </div>
          {fbHistoryOpen ? (
            <div style={{ marginTop:"12px" }}>
              {allSubs.length === 0 ? (
                <div style={{ color:C.textMuted, fontSize:"12px" }}>No submissions yet.</div>
              ) : (
                <div>
                  {allSubs.map(function(sub) {
                    var dt = sub.timestamp ? new Date(sub.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " " + new Date(sub.timestamp).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) : "";
                    var label = sub.category || sub.location || "";
                    var preview = (sub.body || "").length > 80 ? (sub.body || "").slice(0, 80) + "…" : (sub.body || "");
                    return (
                      <div key={sub.id} style={{ borderBottom:"1px solid rgba(15,31,61,0.06)", paddingBottom:"8px", marginBottom:"8px" }}>
                        <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"2px" }}>
                          <span style={{ fontSize:"10px", color:C.textMuted }}>{dt}</span>
                          {label ? <span style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"4px", background:"rgba(15,31,61,0.08)", color:C.navy, fontWeight:"bold" }}>{label}</span> : null}
                        </div>
                        <div style={{ fontSize:"11px", color:C.text }}>{preview}</div>
                      </div>
                    );
                  })}
                  <button style={{ ...S.btn("ghost"), color:C.red, marginTop:"4px" }}
                    onClick={function() {
                      if (confirm("Clear all saved feedback? This cannot be undone.")) {
                        try { localStorage.removeItem("feedback:submissions"); } catch(e2) {}
                        try { localStorage.removeItem("feedback:bugs"); } catch(e2) {}
                      }
                    }}>
                    Clear All
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </div>
    );
  }

  // ============================================================
  // PDF GENERATION
  // Builds a PDF from grid data using jsPDF (loaded from CDN).
  // No DOM-to-PDF conversion — built programmatically from data
  // so it works in the artifact sandbox and on mobile browsers.
  // ============================================================
  function generatePDF(mode) {
    // mode: "download" (default) or "share"
    if (mode === "share") { setPdfSharing(true); } else { setPdfLoading(true); }

    try {
        var doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
        var navy  = [15,31,61];
        var gold  = [245,200,66];
        var cream = [253,246,236];
        var W = 210; var margin = 14;
        var contentW = W - margin * 2;
        var y = margin;
        var teamName = activeTeam ? activeTeam.name : "My Team";
        var today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });

        // ── Header ─────────────────────────────────────────────
        doc.setFillColor(navy[0], navy[1], navy[2]);
        doc.rect(0, 0, W, 28, "F");
        // M circle
        doc.setFillColor(200, 16, 46);
        doc.circle(margin + 7, 14, 6, "F");
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica","bold");
        doc.text("M", margin + 7, 16.5, { align:"center" });
        // Title
        doc.setTextColor(255,255,255);
        doc.setFontSize(16);
        doc.text(teamName + " - Game Day Lineup", margin + 18, 13);
        doc.setFontSize(9);
        doc.setFont("helvetica","normal");
        doc.setTextColor(180,200,220);
        doc.text(today, margin + 18, 20);
        y = 36;

        var innArr2 = [];
        for (var i = 0; i < innings; i++) { innArr2.push(i); }

        // ── Defensive section ────────────────────────────────────
        if (printOpt === "both" || printOpt === "defense") {
          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.setFontSize(9);
          doc.setFont("helvetica","bold");
          doc.text("DEFENSIVE ASSIGNMENTS", margin, y);
          y += 5;

          if (printDefView === "diamond") {
            // ── Diamond layout in PDF ──────────────────────────────
            var posLayoutPDF = [
              { pos:"LF", label:"Left Field",    cx:14,  cy:y },
              { pos:"LC", label:"Left Center",   cx:67,  cy:y },
              { pos:"RC", label:"Right Center",  cx:121, cy:y },
              { pos:"RF", label:"Right Field",   cx:174, cy:y },
              { pos:"SS", label:"Shortstop",     cx:68,  cy:y + 46 },
              { pos:"2B", label:"2nd Base",      cx:120, cy:y + 46 },
              { pos:"3B", label:"3rd Base",      cx:14,  cy:y + 46 },
              { pos:"P",  label:"Pitcher",       cx:94,  cy:y + 46 },
              { pos:"1B", label:"1st Base",      cx:174, cy:y + 46 },
              { pos:"C",  label:"Catcher",       cx:94,  cy:y + 92 }
            ];

            var pBoxW = 52; var pLineH = 4.2; var pHeaderH = 5.5;

            for (var pli2 = 0; pli2 < posLayoutPDF.length; pli2++) {
              var pl2 = posLayoutPDF[pli2];
              var pc3 = POS_COLORS[pl2.pos] || "#555";
              var pc3safe = pc3.length === 4 ? "#" + pc3[1]+pc3[1]+pc3[2]+pc3[2]+pc3[3]+pc3[3] : pc3;
              var rgb3 = [parseInt(pc3safe.slice(1,3),16)||85, parseInt(pc3safe.slice(3,5),16)||85, parseInt(pc3safe.slice(5,7),16)||85];
              var pBoxH2 = pHeaderH + innings * pLineH + 2;

              doc.setDrawColor(rgb3[0],rgb3[1],rgb3[2]);
              doc.setLineWidth(0.6);
              doc.roundedRect(pl2.cx, pl2.cy, pBoxW, pBoxH2, 1.5, 1.5, "S");
              doc.setFillColor(rgb3[0],rgb3[1],rgb3[2]);
              doc.roundedRect(pl2.cx, pl2.cy, pBoxW, pHeaderH, 1.5, 1.5, "F");
              doc.rect(pl2.cx, pl2.cy + 2, pBoxW, pHeaderH - 2, "F");
              doc.setTextColor(255,255,255);
              doc.setFontSize(6.5);
              doc.setFont("helvetica","bold");
              doc.text(pl2.label.toUpperCase(), pl2.cx + pBoxW/2, pl2.cy + 3.8, { align:"center" });

              for (var pinn = 0; pinn < innings; pinn++) {
                var pRowY = pl2.cy + pHeaderH + pinn * pLineH + pLineH/2 + 1;
                var pFound = "";
                for (var pri3 = 0; pri3 < roster.length; pri3++) {
                  if ((grid[roster[pri3].name]||[])[pinn] === pl2.pos) { pFound = roster[pri3].name; break; }
                }
                doc.setTextColor(170,170,170);
                doc.setFontSize(5.5);
                doc.text(String(pinn+1), pl2.cx + 3, pRowY + 1);
                if (pFound) {
                  doc.setTextColor(25,30,60);
                  doc.setFont("helvetica","bold");
                } else {
                  doc.setTextColor(200,200,200);
                  doc.setFont("helvetica","normal");
                }
                doc.setFontSize(6.5);
                doc.text(pFound ? firstName(pFound) : "-", pl2.cx + 8, pRowY + 1);
              }
            }
            y += 192;

            // Bench strip
            doc.setTextColor(navy[0],navy[1],navy[2]);
            doc.setFontSize(7.5);
            doc.setFont("helvetica","bold");
            doc.text("BENCH", margin, y);
            y += 4;
            var pBColW = contentW / innings;
            var pBRowH = 6;
            for (var pbi = 0; pbi < innings; pbi++) {
              doc.setFillColor(245,239,228);
              doc.rect(margin + pbi*pBColW, y, pBColW, pBRowH, "F");
              doc.setDrawColor(200,195,188);
              doc.setLineWidth(0.2);
              doc.rect(margin + pbi*pBColW, y, pBColW, pBRowH);
              doc.setTextColor(80,80,80);
              doc.setFontSize(6);
              doc.setFont("helvetica","bold");
              doc.text("Inn "+(pbi+1), margin + pbi*pBColW + pBColW/2, y + 4, {align:"center"});
            }
            y += pBRowH;
            var pMaxB = 0;
            for (var pbi2 = 0; pbi2 < innings; pbi2++) {
              var pCnt = roster.filter(function(r){return (grid[r.name]||[])[pbi2]==="Bench";}).length;
              if (pCnt > pMaxB) pMaxB = pCnt;
            }
            for (var pbr = 0; pbr < pMaxB; pbr++) {
              for (var pbi3 = 0; pbi3 < innings; pbi3++) {
                var pBRoster = roster.filter(function(r){return (grid[r.name]||[])[pbi3]==="Bench";});
                var pBName = pBRoster[pbr] ? pBRoster[pbr].name : "";
                doc.setFillColor(pbr%2===0?255:250);
                doc.rect(margin + pbi3*pBColW, y, pBColW, pBRowH, "F");
                doc.setDrawColor(220,215,208);
                doc.setLineWidth(0.2);
                doc.rect(margin + pbi3*pBColW, y, pBColW, pBRowH);
                if (pBName) {
                  doc.setTextColor(25,30,60);
                  doc.setFont("helvetica","bold");
                  doc.setFontSize(6.5);
                  doc.text(firstName(pBName), margin + pbi3*pBColW + pBColW/2, y + 4, {align:"center"});
                }
              }
              y += pBRowH;
            }
            y += (printOpt === "both" ? 8 : 0);

          } else {
            // ── Grid table in PDF (existing) ──────────────────────

          var colW = contentW / (innArr2.length + 1);
          var nameColW = colW * 1.8;
          var innColW = (contentW - nameColW) / innArr2.length;
          var rowH = 8;

          // Header row
          doc.setFillColor(cream[0], cream[1], cream[2]);
          doc.rect(margin, y, contentW, rowH, "F");
          doc.setDrawColor(navy[0], navy[1], navy[2]);
          doc.setLineWidth(0.4);
          doc.rect(margin, y, contentW, rowH);
          doc.setFontSize(7.5);
          doc.setFont("helvetica","bold");
          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.text("PLAYER", margin + 3, y + 5.2);
          for (var ii = 0; ii < innArr2.length; ii++) {
            var hx = margin + nameColW + ii * innColW + innColW / 2;
            doc.text("INN " + (ii + 1), hx, y + 5.2, { align:"center" });
          }
          y += rowH;

          // Data rows
          doc.setFont("helvetica","normal");
          for (var ri = 0; ri < roster.length; ri++) {
            var info2 = roster[ri];
            var rowBg = ri % 2 === 0 ? [255,255,255] : [250,248,245];
            doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
            doc.rect(margin, y, contentW, rowH, "F");
            doc.setDrawColor(220, 215, 208);
            doc.setLineWidth(0.2);
            doc.line(margin, y + rowH, margin + contentW, y + rowH);

            doc.setFontSize(8.5);
            doc.setFont("helvetica","bold");
            doc.setTextColor(navy[0], navy[1], navy[2]);
            doc.text(firstName(info2.name), margin + 3, y + 5.2);

            doc.setFont("helvetica","normal");
            for (var ci = 0; ci < innArr2.length; ci++) {
              var pos2 = (grid[info2.name] || [])[ci] || "";
              var cx = margin + nameColW + ci * innColW + innColW / 2;
              if (pos2 && pos2 !== "") {
                // Color pill per position
                var pc = POS_COLORS[pos2] || "#555";
                var pcsafe = pc.length === 4 ? "#" + pc[1]+pc[1]+pc[2]+pc[2]+pc[3]+pc[3] : pc;
                var rgb = [parseInt(pcsafe.slice(1,3),16)||85, parseInt(pcsafe.slice(3,5),16)||85, parseInt(pcsafe.slice(5,7),16)||85];
                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                doc.roundedRect(cx - innColW/2 + 2, y + 1.5, innColW - 4, rowH - 3, 1.5, 1.5, "F");
                doc.setTextColor(255,255,255);
                doc.setFontSize(7.5);
                doc.setFont("helvetica","bold");
                doc.text(pos2, cx, y + 5.4, { align:"center" });
              } else {
                doc.setTextColor(180,180,180);
                doc.setFontSize(8);
                doc.text("-", cx, y + 5.2, { align:"center" });
              }
            }
            y += rowH;
          }
            y += 8;
          } // end grid table else
        }

        // ── Batting Order ───────────────────────────────────────
        if (printOpt === "both" || printOpt === "batting") {
          // New page if not enough space
          if (y > 220) { doc.addPage(); y = margin; }

          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.setFontSize(9);
          doc.setFont("helvetica","bold");
          doc.text("BATTING ORDER", margin, y);
          y += 6;

          var batCols = 2;
          var batColW = contentW / batCols;
          var batRowH = 9;

          for (var bi = 0; bi < battingOrder.length; bi++) {
            var bname = battingOrder[bi];
            var col = bi % batCols;
            var row = Math.floor(bi / batCols);
            var bx = margin + col * batColW;
            var by = y + row * batRowH;

            // Card background
            doc.setFillColor(255,255,255);
            doc.setDrawColor(220,215,208);
            doc.setLineWidth(0.3);
            doc.roundedRect(bx + 1, by, batColW - 2, batRowH - 1, 1.5, 1.5, "FD");

            // Number circle
            doc.setFillColor(navy[0], navy[1], navy[2]);
            doc.circle(bx + 6, by + 4.3, 3.2, "F");
            doc.setTextColor(255,255,255);
            doc.setFontSize(7);
            doc.setFont("helvetica","bold");
            doc.text(String(bi + 1), bx + 6, by + 5.6, { align:"center" });

            // Name
            doc.setTextColor(navy[0], navy[1], navy[2]);
            doc.setFontSize(9);
            doc.setFont("helvetica","bold");
            doc.text(firstName(bname), bx + 11, by + 5);

            // Field positions
            var fpos = [];
            for (var fii = 0; fii < innings; fii++) {
              var fp = (grid[bname] || [])[fii];
              if (!fp || fp === "") {
                fpos.push("-");
              } else if (fp === "Bench") {
                fpos.push("–");
              } else {
                fpos.push(fp);
              }
            }
            if (fpos.length > 0) {
              doc.setTextColor(120, 130, 150);
              doc.setFontSize(6.5);
              doc.setFont("helvetica","normal");
              doc.text(fpos.join(" "), bx + 11, by + 7.5);
            }
          }
          y += (Math.ceil(battingOrder.length / batCols)) * batRowH + 4;
        }

        // ── Footer ──────────────────────────────────────────────
        var pageH = doc.internal.pageSize.height;
        doc.setTextColor(150, 160, 175);
        doc.setFontSize(7);
        doc.setFont("helvetica","normal");
        doc.text("Lineup Generator - " + teamName + (activeTeam && activeTeam.ageGroup ? " " + activeTeam.ageGroup : ""), margin, pageH - 8);
        doc.text(today, W - margin, pageH - 8, { align:"right" });

        // ── Save or Share ────────────────────────────────────────
        var filename = teamName.replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-lineup-" + new Date().toISOString().slice(0,10) + ".pdf";
        track(mode === "share" ? "share_pdf" : "download_pdf", {});

        if (mode === "share") {
          // Web Share API v2 file sharing.
          // Use arraybuffer → explicit Blob to avoid jsPDF returning Uint8Array.
          // iOS Safari requires navigator.share() to be called synchronously
          // within the user-gesture chain — PDF generation must complete first.
          try {
            var ab   = doc.output("arraybuffer");
            var blob = new Blob([ab], { type:"application/pdf" });
            var file = new File([blob], filename, { type:"application/pdf" });
            var canShareFiles = (
              typeof navigator.share === "function" &&
              typeof navigator.canShare === "function" &&
              navigator.canShare({ files: [file] })
            );
            if (canShareFiles) {
              navigator.share({
                title: teamName + " Lineup",
                text:  "Game day lineup for " + teamName,
                files: [file]
              }).then(function() {
                setPdfSharing(false);
              }).catch(function(err) {
                if (err.name !== "AbortError") {
                  // Share failed — fall back to download silently
                  doc.save(filename);
                }
                setPdfSharing(false);
              });
            } else {
              // Device/browser doesn't support file sharing — download instead
              doc.save(filename);
              setPdfSharing(false);
            }
          } catch (shareErr) {
            console.warn("Share setup failed:", shareErr);
            doc.save(filename);
            setPdfSharing(false);
          }
        } else {
          doc.save(filename);
          setPdfLoading(false);
        }
    } catch(err) {
      setPdfLoading(false);
      setPdfSharing(false);
      console.error("PDF generation error:", err);
      alert("PDF generation failed: " + err.message);
    }
  }

  // ============================================================
  // LINKS TAB
  // ============================================================
  function renderLinks() {
    var LINKS = [
      {
        group: "Schedule & Registration",
        items: [
          {
            label: "County Official Game Schedule",
            desc: "Forsyth County 2026 Youth Baseball & Softball — full season schedule",
            url: COUNTY_SCHEDULE_URL,
            emoji: "📅"
          },
          {
            label: "Field & Cage Request",
            desc: "Request field or batting cage time from Forsyth County Parks",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeCIvqZlGsxonkWpFJ52q_6PWrOl3mmOTjTdiPGcz3ZQGzJDQ/viewform",
            emoji: "⚾"
          }
        ]
      },
      {
        group: "League & Club",
        items: [
          {
            label: "Sharon Springs Athletics",
            desc: "Sharon Springs community athletics — league info, teams, and events",
            url: "https://sharonspringsathletics.org/",
            emoji: "🏆"
          }
        ]
      },
      {
        group: "Weather & Alerts",
        items: [
          {
            label: "Inclement Weather Updates",
            desc: "Forsyth County Parks — field closures and weather delays",
            url: "https://parks.forsythco.com/Athletic-Leagues/Inclement-Weather-Information",
            emoji: "⛈️"
          },
          {
            label: "Status Me Auto Alerts",
            desc: "Sign up for automatic game status notifications",
            url: "https://statusme.com/",
            emoji: "🔔"
          }
        ]
      }
    ];

    return (
      <div>
        {LINKS.map(function(section) {
          return (
            <div key={section.group} style={S.card}>
              <div style={S.sectionTitle}>{section.group}</div>
              {section.items.map(function(link, li) {
                return (
                  <a key={li} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"12px 0",
                      borderBottom: li < section.items.length - 1 ? "1px solid rgba(15,31,61,0.07)" : "none",
                      textDecoration:"none", color:"inherit" }}>
                    <span style={{ fontSize:"22px", lineHeight:"1", marginTop:"2px", flexShrink:0 }}>{link.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"13px", fontWeight:"700", color:C.navy, marginBottom:"3px" }}>{link.label}</div>
                      <div style={{ fontSize:"11px", color:C.textMuted, lineHeight:"1.5", marginBottom:"5px" }}>{link.desc}</div>
                      <div style={{ fontSize:"10px", color:C.red, wordBreak:"break-all", opacity:0.8 }}>{link.url}</div>
                    </div>
                    <span style={{ fontSize:"14px", color:C.textMuted, flexShrink:0, marginTop:"4px" }}>↗</span>
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // ABOUT TAB
  // ============================================================
  function renderAbout() {
    var onboardingSteps = [
      {
        title: "Step 1 \u2014 Install the App",
        body: "Tap your browser's share/menu button and select \"Add to Home Screen.\" The app works offline after first load \u2014 no signal needed at the field."
      },
      {
        title: "Step 2 \u2014 Create Your Team",
        body: "From the Home screen, tap \"Create New Team.\" Enter your team name, age group, and season year."
      },
      {
        title: "Step 3 \u2014 Build Your Roster",
        body: "Go to the Roster tab. Tap \"Add Player\" for each player. Expand each player card to set skills, coach tags, and preferred positions. Even 2\u20133 skills per player significantly improves auto-assign quality."
      },
      {
        title: "Step 4 \u2014 Add Your Schedule",
        body: "Go to the Schedule tab. Tap \"Add Game.\" Use AI Photo Import to take a photo of your printed schedule \u2014 it parses automatically in seconds."
      },
      {
        title: "Step 5 \u2014 Generate a Lineup",
        body: "Go to the Field Grid tab. Set your innings (4, 5, or 6). Tap \"Auto-Assign.\" The engine places 10 players per inning with 1 on bench, rotating fairly across all positions."
      },
      {
        title: "Step 6 \u2014 Set the Batting Order",
        body: "Go to the Batting tab. Tap \"Suggest Order\" for a stats-driven recommendation. Drag cards or use up/down arrows to reorder."
      },
      {
        title: "Step 7 \u2014 Share With Your Team",
        body: "From the Schedule tab, tap a game then \"Share Lineup.\" Send the link to parents and scorekeepers \u2014 no account needed to view."
      },
      {
        title: "Step 8 \u2014 Back Up Your Data",
        body: "Use Export Backup (in Settings or Print tab) to save a JSON file after every few games. Restore it on any device via Import Backup."
      }
    ];

    return (
      <div>
        {/* \u2500\u2500 Section 3: Onboarding Guide (collapsible) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
            onClick={function() { setAboutGuideOpen(!aboutGuideOpen); }}>
            <div style={S.sectionTitle}>How to Use This App</div>
            <span style={{ fontSize:"12px", color:C.textMuted, marginBottom:"14px" }}>{aboutGuideOpen ? "\u25b2" : "\u25bc"}</span>
          </div>
          {aboutGuideOpen ? (
            <div>
              {onboardingSteps.map(function(step, si) {
                return (
                  <div key={si} style={{ marginBottom:"14px", paddingBottom:"14px", borderBottom: si < onboardingSteps.length - 1 ? "1px solid rgba(15,31,61,0.07)" : "none" }}>
                    <div style={{ fontSize:"12px", fontWeight:"bold", color:C.navy, marginBottom:"4px" }}>{step.title}</div>
                    <div style={{ fontSize:"12px", color:C.text, lineHeight:"1.6" }}>{step.body}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        {/* \u2500\u2500 Section 1: App Info \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div style={S.card}>
          <div style={{ fontSize:"20px", fontWeight:"bold", color:C.navy, marginBottom:"4px" }}>Lineup Generator &#x26be;</div>
          <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"12px" }}>Built for youth baseball coaches. Runs at the field.</div>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap", marginBottom:"14px" }}>
            <span style={{ fontSize:"11px", padding:"3px 10px", borderRadius:"10px", background:"rgba(15,31,61,0.07)", color:C.navy, fontWeight:"bold" }}>
              Version {APP_VERSION}
            </span>
            <a href="https://line-up-generator.vercel.app" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:"11px", color:C.red, textDecoration:"underline", fontWeight:"bold" }}>
              line-up-generator.vercel.app
            </a>
          </div>
          <button style={S.btn("ghost")}
            onClick={function() {
              try { localStorage.removeItem("onboarding:v1:complete"); } catch(e) {}
              setShowOnboarding(true);
            }}>
            Getting Started
          </button>
        </div>

        {/* \u2500\u2500 Section 2: Version History \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>What&#x27;s New</div>
          {VERSION_HISTORY.map(function(v, vi) {
            var isCurrent = v.version === APP_VERSION;
            return (
              <div key={v.version} style={{
                borderLeft: isCurrent ? "3px solid #27ae60" : "3px solid rgba(15,31,61,0.1)",
                background: isCurrent ? "rgba(39,174,96,0.04)" : "transparent",
                borderRadius: "0 6px 6px 0",
                padding: "10px 14px",
                marginBottom: vi < VERSION_HISTORY.length - 1 ? "12px" : "0"
              }}>
                <div style={{ display:"flex", gap:"10px", alignItems:"baseline", marginBottom:"8px", flexWrap:"wrap" }}>
                  <span style={{ fontSize:"14px", fontWeight:"bold", color:C.navy }}>v{v.version}</span>
                  <span style={{ fontSize:"11px", color:C.textMuted }}>{v.date}</span>
                  {isCurrent ? <span style={{ fontSize:"10px", padding:"1px 7px", borderRadius:"10px", background:"#27ae60", color:"#fff", fontWeight:"bold" }}>Current</span> : null}
                </div>
                <ul style={{ margin:"0", paddingLeft:"16px" }}>
                  {v.changes.map(function(ch, ci) {
                    return <li key={ci} style={{ fontSize:"12px", color:C.text, marginBottom:"3px", lineHeight:"1.5" }}>{ch}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>

      </div>
    );
  }

  // ============================================================
  // PRINT TAB
  // ============================================================
  function renderPrint() {
    var teamName = activeTeam ? activeTeam.name : "My Team";
    var today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
    var innArr = [];
    for (var i = 0; i < innings; i++) { innArr.push(i); }

    return (
      <div>
        <div style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap", marginBottom:"8px" }}>
            <div style={{ display:"flex", gap:"6px" }}>
              {[["Both","both"],["Defense","defense"],["Batting","batting"]].map(function(row) {
                var active = printOpt === row[1];
                return (
                  <button key={row[1]} onClick={function(v) { return function() { setPrintOpt(v); }; }(row[1])}
                    style={{ ...S.btn(active ? "primary" : "ghost"), padding:"6px 14px" }}>
                    {row[0]}
                  </button>
                );
              })}
            </div>
            <button style={S.btn("gold")} onClick={function() { generatePDF("download"); }} disabled={pdfLoading || pdfSharing}>
              {pdfLoading ? "Generating..." : "Download PDF"}
            </button>
            <button style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.2)" }} onClick={function() { generatePDF("share"); }} disabled={pdfLoading || pdfSharing}>
              {pdfSharing ? "Preparing..." : "Share PDF"}
            </button>
            <button style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.2)" }} onClick={shareCurrentLineup}>
              🔗 Share Link
            </button>
            <button style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.15)" }} onClick={exportTeamData}>
              ⬇ Backup
            </button>
            <label style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.15)", cursor:"pointer" }}>
              ⬆ Restore
              <input type="file" accept=".json" style={{ display:"none" }}
                onChange={function(e) { importTeamData(e.target.files[0]); e.target.value=""; }} />
            </label>
          </div>
          {(printOpt === "both" || printOpt === "defense") ? (
            <div style={{ display:"flex", gap:"4px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px", width:"fit-content" }}>
              {[["Grid","grid"],["Diamond","diamond"]].map(function(opt) {
                var active = printDefView === opt[1];
                return (
                  <button key={opt[1]}
                    onClick={function(v) { return function() { setPrintDefView(v); if (v !== "diamond") { setPrintDiamondInning(null); } }; }(opt[1])}
                    style={{ padding:"4px 14px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                      background: active ? C.white : "transparent",
                      color: active ? C.navy : C.textMuted,
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                    {opt[0]}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div id="print-card" style={{ background:"#fff", border:"2px solid #0f1f3d", borderRadius:"10px", padding:"20px", maxWidth:"800px" }}>
          <div style={{ textAlign:"center", borderBottom:"2px solid #0f1f3d", paddingBottom:"12px", marginBottom:"16px" }}>
            <div style={{ fontSize:"22px", fontWeight:"bold", color:"#0f1f3d" }}>{teamName} - Game Day Lineup</div>
            <div style={{ fontSize:"13px", color:"#6a7a9a", marginTop:"4px" }}>{today}</div>
          </div>

          {printOpt === "both" || printOpt === "defense" ? (
            <div style={{ marginBottom: printOpt === "both" ? "20px" : 0 }}>
              <div style={{ fontSize:"12px", fontWeight:"bold", color:"#0f1f3d", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"10px" }}>
                Defensive Assignments
              </div>
              {printDefView === "diamond" ? (
                (function() {
                  // posBoxP delegates to shared renderPosBox with print-tab inning filter
                  function posBoxP(pos, label) { return renderPosBox(pos, label, printDiamondInning); }
                  function getPrintPlayerFn(pos, inn) {
                    for (var pi = 0; pi < roster.length; pi++) {
                      if ((grid[roster[pi].name] || [])[inn] === pos) { return roster[pi].name; }
                    }
                    return "";
                  }
                  var benchByInningP = [];
                  for (var bip = 0; bip < innings; bip++) {
                    benchByInningP.push(roster.filter(function(r){ return (grid[r.name]||[])[bip] === "Bench"; }).map(function(r){ return r.name; }));
                  }
                  return (
                    <div>
                      {/* ── Inning selector — single scrollable row ─── */}
                      <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center", marginBottom:"10px", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:"2px" }}>
                        <span style={{ fontSize:"9px", color:"#6a7a9a", fontWeight:"bold", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
                        <button onClick={function() { setPrintDiamondInning(null); }}
                          style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                            background: printDiamondInning === null ? "#0f1f3d" : "rgba(15,31,61,0.07)",
                            color: printDiamondInning === null ? "#fff" : "#6a7a9a" }}>All</button>
                        {innArr.map(function(i) {
                          var active = printDiamondInning === i;
                          return (
                            <button key={i} onClick={function(idx) { return function() { setPrintDiamondInning(idx); }; }(i)}
                              style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                                background: active ? "#c8102e" : "rgba(15,31,61,0.07)",
                                color: active ? "#fff" : "#6a7a9a" }}>
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    {renderFieldSVG(getPrintPlayerFn, printDiamondInning, innArr)}
                    <div style={{ marginTop:"8px", borderTop:"2px solid rgba(15,31,61,0.15)", paddingTop:"10px" }}>
                        <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
                        {(function() {
                          var pbDisplay = printDiamondInning !== null ? [benchByInningP[printDiamondInning] || []] : benchByInningP;
                          var pbLabels  = printDiamondInning !== null ? [printDiamondInning] : innArr;
                          return (
                            <div style={{ overflowX:"auto" }}>
                              <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
                                <thead>
                                  <tr style={{ background:"#f5efe4" }}>
                                    {pbLabels.map(function(i) { return <th key={i} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px", color:"#555", fontWeight:"bold", borderBottom:"2px solid rgba(15,31,61,0.15)", minWidth:"60px" }}>Inn {i+1}</th>; })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(function() {
                                    var maxB = 0;
                                    for (var di = 0; di < pbDisplay.length; di++) { if (pbDisplay[di].length > maxB) maxB = pbDisplay[di].length; }
                                    var rows = [];
                                    for (var r = 0; r < maxB; r++) {
                                      rows.push(<tr key={r}>{pbLabels.map(function(lbl, ci) { var pn = pbDisplay[ci][r] || ""; return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)", fontWeight:"bold", color:pn?"#0f1f3d":"#ccc" }}>{pn ? firstName(pn) : "-"}</td>; })}</tr>);
                                    }
                                    return rows;
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()
              ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    <th style={{ padding:"6px 10px", textAlign:"left", borderBottom:"2px solid #0f1f3d", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Player</th>
                    {innArr.map(function(i) {
                      return <th key={i} style={{ padding:"6px 8px", textAlign:"center", borderBottom:"2px solid #0f1f3d", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Inn {i+1}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roster.map(function(info, ri) {
                    return (
                      <tr key={info.name} style={{ background: ri % 2 === 0 ? "#fff" : "#faf8f5" }}>
                        <td style={{ padding:"6px 10px", fontWeight:"bold", borderBottom:"1px solid rgba(15,31,61,0.06)" }}>
                          {firstName(info.name)}
                        </td>
                        {innArr.map(function(i) {
                          var pos = (grid[info.name] || [])[i] || "";
                          return (
                            <td key={i} style={{ padding:"5px 6px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)" }}>
                              {pos ? (
                                <span style={{ display:"inline-block", padding:"2px 6px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px",
                                  background: (POS_COLORS[pos] || "#555") + "cc", color:"#fff" }}>
                                  {pos}
                                </span>
                              ) : (
                                <span style={{ color:"#ccc" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          ) : null}

          {printOpt === "both" || printOpt === "batting" ? (
            <div>
              <div style={{ fontSize:"12px", fontWeight:"bold", color:"#0f1f3d", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"10px" }}>
                Batting Order
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"6px" }}>
                {battingOrder.map(function(name, idx) {
                  var info = null;
                  for (var ri = 0; ri < roster.length; ri++) { if (roster[ri].name === name) { info = roster[ri]; break; } }
                  var fieldPos = [];
                  for (var ii = 0; ii < innings; ii++) {
                    var pos = (grid[name] || [])[ii];
                    if (!pos || pos === "") {
                      fieldPos.push("-");
                    } else if (pos === "Bench") {
                      fieldPos.push("–");
                    } else {
                      fieldPos.push(pos);
                    }
                  }
                  return (
                    <div key={name} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 10px", border:"1px solid rgba(15,31,61,0.1)", borderRadius:"6px", background:"#fff" }}>
                      <div style={{ width:"20px", height:"20px", borderRadius:"50%", background:"#0f1f3d", color:"#fff", fontSize:"10px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:"bold", fontSize:"12px" }}>{firstName(name)}</div>
                        {fieldPos.length > 0 ? (
                          <div style={{ fontSize:"9px", color:"#8a9aaa" }}>{fieldPos.join(", ")}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ============================================================
  // SHARED LINEUP VIEW (read-only, opened via share link)
  // ============================================================
  function renderSharedView(payload) {
    // Derive inning count from grid
    var innCount = 0;
    for (var k in payload.grid) {
      if ((payload.grid[k] || []).length > innCount) { innCount = payload.grid[k].length; }
    }
    var innArr = [];
    for (var i = 0; i < innCount; i++) { innArr.push(i); }
    var rosterNames = payload.roster || [];

    // Local state for inning filter and view mode — version-counter pattern (no hooks import)
    var _svInn = useState(null);
    var svInn = _svInn[0]; var setSvInn = _svInn[1];
    var _svView = useState("diamond");
    var svView = _svView[0]; var setSvView = _svView[1];

    // Build position box from payload.grid (no live React state here)
    function sharedPosBox(pos) {
      var pc = POS_COLORS[pos] || "#555";
      var isSingle = svInn !== null;
      var innPlayers = [];
      for (var ii = 0; ii < innCount; ii++) {
        if (isSingle && ii !== svInn) { continue; }
        var found = "";
        for (var pi = 0; pi < rosterNames.length; pi++) {
          if ((payload.grid[rosterNames[pi]] || [])[ii] === pos) { found = rosterNames[pi]; break; }
        }
        innPlayers.push({ inn: ii + 1, name: found });
      }
      return (
        <div style={{ background:"rgba(255,255,255,0.97)", border:"2px solid " + pc, borderRadius:"7px",
          padding: isSingle ? "5px 8px" : "3px 5px", width:"100%", boxSizing:"border-box",
          boxShadow:"0 1px 5px rgba(0,0,0,0.14)", overflow:"hidden", minWidth:0 }}>
          <div style={{ fontSize:"9px", fontWeight:"bold", color:pc, textAlign:"center",
            borderBottom:"1px solid "+pc+"44", paddingBottom:"2px", marginBottom: isSingle ? "4px" : "2px" }}>{pos}</div>
          {innPlayers.map(function(row) {
            return isSingle ? (
              <div key={row.inn} style={{ fontSize:"12px", fontWeight: row.name ? "bold" : "normal",
                color: row.name ? C.navy : "#bbb", textAlign:"center", padding:"1px 0",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {row.name ? firstName(row.name) : "-"}
              </div>
            ) : (
              <div key={row.inn} style={{ display:"flex", gap:"2px", alignItems:"baseline", fontSize:"9.5px", lineHeight:"1.5", overflow:"hidden" }}>
                <span style={{ color:"#aaa", fontSize:"7.5px", minWidth:"8px", textAlign:"right", flexShrink:0 }}>{row.inn}</span>
                <span style={{ fontWeight: row.name ? "bold" : "normal", color: row.name ? C.navy : "#ccc",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, flex:1 }}>{row.name ? firstName(row.name) : "-"}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Bench for selected inning(s)
    var benchByInning = innArr.map(function(ii) {
      return rosterNames.filter(function(n) { return (payload.grid[n] || [])[ii] === "Bench"; });
    });
    var benchDisplay   = svInn !== null ? [benchByInning[svInn] || []] : benchByInning;
    var benchLabels    = svInn !== null ? [svInn] : innArr;
    function getSharedPlayerFn(pos, inn) {
      for (var pi = 0; pi < rosterNames.length; pi++) {
        if ((payload.grid[rosterNames[pi]] || [])[inn] === pos) { return rosterNames[pi]; }
      }
      return "";
    }

    var teamInitial = payload.team ? payload.team.charAt(0).toUpperCase() : "L";
    var IF_POSITIONS = ["3B","SS","P","2B","1B"];
    var OF_POSITIONS = ["LF","LC","RC","RF"];

    return (
      <div style={{ minHeight:"100vh", background:C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ background:"linear-gradient(135deg,#0f1f3d,#1a3260)", borderBottom:"4px solid " + C.red, padding:"14px 20px" }}>
          <div style={{ maxWidth:"800px", margin:"0 auto", display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:C.red, border:"2.5px solid "+C.gold,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", fontWeight:"bold", color:C.gold, flexShrink:0 }}>
              {teamInitial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"17px", fontWeight:"bold", color:C.gold, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {payload.team}
              </div>
              {payload.game ? (
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", marginTop:"1px" }}>
                  vs {payload.game.opponent}
                  {payload.game.date ? " · " + new Date(payload.game.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}) : ""}
                  {payload.game.time ? " · " + payload.game.time : ""}
                </div>
              ) : (
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", marginTop:"1px" }}>Game Day Lineup</div>
              )}
            </div>
            <button onClick={function() { window.print(); }}
              style={{ padding:"6px 14px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.1)",
                color:"rgba(255,255,255,0.75)", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", cursor:"pointer", flexShrink:0 }}>
              Print
            </button>
          </div>
        </div>

        <div style={{ maxWidth:"800px", margin:"0 auto", padding:"16px 20px" }}>

          {/* ── Controls row: inning filter + view toggle ───────── */}
          <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"16px", flexWrap:"wrap" }}>
            {/* Inning pills */}
            <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center", overflowX:"auto", WebkitOverflowScrolling:"touch", flex:1, minWidth:0 }}>
              <span style={{ fontSize:"9px", color:C.textMuted, fontWeight:"bold", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
              <button onClick={function() { setSvInn(null); }}
                style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                  background: svInn === null ? C.navy : "rgba(15,31,61,0.08)", color: svInn === null ? "#fff" : C.textMuted }}>All</button>
              {innArr.map(function(i) {
                var active = svInn === i;
                return (
                  <button key={i} onClick={function(idx) { return function() { setSvInn(idx); }; }(i)}
                    style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                      background: active ? C.red : "rgba(15,31,61,0.08)", color: active ? "#fff" : C.textMuted }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            {/* View toggle */}
            <div style={{ display:"flex", gap:"3px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px", flexShrink:0 }}>
              {[["◆","diamond"],["≡","table"]].map(function(opt) {
                var active = svView === opt[1];
                return (
                  <button key={opt[1]} onClick={function(v) { return function() { setSvView(v); }; }(opt[1])}
                    title={opt[1] === "diamond" ? "Diamond view" : "Table view"}
                    style={{ padding:"4px 10px", borderRadius:"5px", border:"none", cursor:"pointer", fontSize:"12px", fontFamily:"inherit", fontWeight:"bold",
                      background: active ? C.white : "transparent", color: active ? C.navy : C.textMuted,
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                    {opt[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Diamond view ─────────────────────────────────────── */}
          {svView === "diamond" ? (
            <div style={{ marginBottom:"16px" }}>
              {renderFieldSVG(getSharedPlayerFn, svInn, innArr)}
                            {/* Bench strip */}
              <div style={{ borderTop:"2px solid rgba(15,31,61,0.12)", paddingTop:"8px" }}>
                <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
                    <thead>
                      <tr style={{ background:"#f5efe4" }}>
                        {benchLabels.map(function(ii) {
                          return <th key={ii} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px", color:"#555", fontWeight:"bold", borderBottom:"2px solid rgba(15,31,61,0.12)", minWidth:"52px" }}>Inn {ii+1}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(function() {
                        var maxB = 0;
                        for (var di = 0; di < benchDisplay.length; di++) { if (benchDisplay[di].length > maxB) maxB = benchDisplay[di].length; }
                        var rows = [];
                        for (var r = 0; r < maxB; r++) {
                          rows.push(
                            <tr key={r}>
                              {benchLabels.map(function(lbl, ci) {
                                var pn = benchDisplay[ci][r] || "";
                                return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)", fontWeight:"bold", color: pn ? C.navy : "#ccc" }}>{pn ? firstName(pn) : "-"}</td>;
                              })}
                            </tr>
                          );
                        }
                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ── Table view ──────────────────────────────────────── */
            <div style={{ marginBottom:"16px" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr style={{ background:"#f5efe4" }}>
                      <th style={{ padding:"7px 12px", textAlign:"left", fontSize:"10px", color:C.textMuted, borderBottom:"2px solid rgba(15,31,61,0.1)", position:"sticky", left:0, background:"#f5efe4" }}>Player</th>
                      {(svInn !== null ? [svInn] : innArr).map(function(i) {
                        return <th key={i} style={{ padding:"7px 10px", textAlign:"center", fontSize:"10px", color:C.textMuted, borderBottom:"2px solid rgba(15,31,61,0.1)", minWidth:"60px" }}>Inn {i+1}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterNames.map(function(name, ri) {
                      return (
                        <tr key={name} style={{ background: ri%2===0 ? "#fff" : "#faf8f5" }}>
                          <td style={{ padding:"6px 12px", fontWeight:"bold", position:"sticky", left:0, background: ri%2===0?"#fff":"#faf8f5", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>{firstName(name)}</td>
                          {(svInn !== null ? [svInn] : innArr).map(function(i) {
                            var pos = (payload.grid[name] || [])[i] || "";
                            return (
                              <td key={i} style={{ padding:"4px 6px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                                {pos ? <span style={{ display:"inline-block", padding:"2px 5px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px", background:(POS_COLORS[pos]||"#555")+"cc", color:"#fff" }}>{pos}</span> : <span style={{ color:"#ccc" }}>-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Batting order ─────────────────────────────────────── */}
          {payload.batting && payload.batting.length > 0 ? (
            <div style={{ ...S.card, marginTop:"4px" }}>
              <div style={S.sectionTitle}>Batting Order</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:"6px" }}>
                {payload.batting.map(function(name, idx) {
                  var fieldPos = [];
                  for (var ii = 0; ii < innCount; ii++) {
                    var pos = (payload.grid[name] || [])[ii];
                    if (!pos || pos === "") {
                      fieldPos.push("-");
                    } else if (pos === "Bench") {
                      fieldPos.push("–");
                    } else {
                      fieldPos.push(pos);
                    }
                  }
                  return (
                    <div key={name} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 10px", border:"1px solid rgba(15,31,61,0.08)", borderRadius:"6px" }}>
                      <div style={{ width:"20px", height:"20px", borderRadius:"50%", background:C.navy, color:"#fff", fontSize:"10px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{idx+1}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:"bold", fontSize:"12px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{firstName(name)}</div>
                        {fieldPos.length > 0 ? <div style={{ fontSize:"9px", color:C.textMuted }}>{fieldPos.join(", ")}</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div style={{ textAlign:"center", marginTop:"24px", fontSize:"11px", color:C.textMuted, borderTop:"1px solid rgba(15,31,61,0.08)", paddingTop:"16px" }}>
            <div style={{ marginBottom:"4px" }}>View-only lineup · Lineup Generator</div>
            <div style={{ fontSize:"10px", color:"rgba(15,31,61,0.25)" }}>Tap Print to save as PDF or screenshot this page</div>
          </div>
        </div>
      </div>
    );
  }


  // ============================================================
  // MAIN RETURN
  // ============================================================

  // Check for shared lineup in URL
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var shareParam = urlParams.get("share");
    if (shareParam) {
      var payload = JSON.parse(decodeURIComponent(escape(atob(shareParam))));
      return renderSharedView(payload);
    }
  } catch (e) {}

  if (screen === "home") {
    return renderHome();
  }

  var TABS = [
    { key:"roster",   label:"Roster"   },
    { key:"grid",     label:"Defense"  },
    { key:"batting",  label:"Batting"  },
    { key:"schedule", label:"Schedule" },
    { key:"feedback", label:"Feedback" },
    { key:"print",    label:"Print"    },
    { key:"links",    label:"Links"    },
    { key:"about",    label:"About"    }
  ];

  var tabContent = (
    <div>
      {tab === "roster"   ? renderRoster()   : null}
      {tab === "grid"     ? renderGrid()     : null}
      {tab === "batting"  ? renderBatting()  : null}
      {tab === "schedule" ? renderSchedule() : null}
      {tab === "feedback" ? renderFeedback() : null}
      {tab === "print"    ? renderPrint()    : null}
      {tab === "links"    ? renderLinks()    : null}
      {tab === "about"    ? renderAbout()    : null}
    </div>
  );

  if (isLandscape) {
    // ── Landscape: sidebar nav + scrollable content ──────────────────────
    return (
      <div style={{ display:"flex", height:"100dvh", minHeight:"100dvh", background:C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text, overflow:"hidden" }}>

        {/* Left sidebar — fixed width, full height, scrollable nav */}
        <div style={{ width:"64px", minWidth:"64px", background:"linear-gradient(180deg,#0f1f3d 0%,#1a3260 100%)", borderRight:"3px solid " + C.red, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"8px", paddingBottom:"8px", gap:"2px", overflowY:"auto", flexShrink:0 }}>

          {/* Logo button */}
          <div onClick={function() { setScreen("home"); }} style={{ width:"44px", height:"44px", borderRadius:"50%", background:C.red, border:"2px solid " + C.gold, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"bold", color:C.gold, cursor:"pointer", marginBottom:"8px", flexShrink:0 }}>
            {activeTeam ? activeTeam.name.charAt(0).toUpperCase() : "L"}
          </div>

          {/* Generate Lineup button (compact) */}
          {lineupDirty ? (
            <button onClick={generateLineup} style={{ width:"48px", padding:"5px 2px", borderRadius:"6px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"8px", fontFamily:"inherit", letterSpacing:"0.04em", textTransform:"uppercase", background:"linear-gradient(135deg,#f5c842,#d4a017)", color:"#0f1f3d", marginBottom:"6px", textAlign:"center", lineHeight:"1.3" }}>
              Gen
            </button>
          ) : null}

          {/* Tab buttons — vertical, icon + abbreviated label */}
          {TABS.map(function(t) {
            var active = tab === t.key;
            return (
              <button key={t.key}
                onClick={function(k) { return function() { setTab(k); }; }(t.key)}
                style={{ width:"54px", padding:"6px 2px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"8.5px", fontWeight:"bold", fontFamily:"Georgia,serif", letterSpacing:"0.04em", textTransform:"uppercase", textAlign:"center", lineHeight:"1.3",
                  background: active ? C.red : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>
                {t.label}
              </button>
            );
          })}

          {/* Team name at bottom */}
          <div style={{ marginTop:"auto", fontSize:"8px", color:"rgba(255,255,255,0.35)", textAlign:"center", padding:"4px 2px", wordBreak:"break-word", letterSpacing:"0.04em" }}>
            {activeTeam ? activeTeam.name : ""}
          </div>
        </div>

        {/* Main content — scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", maxWidth:"1400px" }}>
          {tabContent}
        </div>
      </div>
    );
  }

  // ── Portrait: top header + content ──────────────────────────────────────
  return (
    <div style={{ minHeight:"100dvh", background:C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text }}>
      <div style={S.header}>
        <div style={S.logoWrap} onClick={function() { setScreen("home"); }}>
          <div style={S.logoCircle}>M</div>
          <div>
            <div style={S.logoTitle}>{activeTeam ? activeTeam.name : "Lineup Generator"}</div>
            <div style={S.logoSub}>{activeTeam ? (activeTeam.ageGroup || "") + " " + (activeTeam.year || "") : "tap to switch team"}</div>
            {isSupabaseEnabled ? (
              <div title={syncStatus === "synced" ? "Saved to cloud" : syncStatus === "syncing" ? "Saving..." : syncStatus === "error" ? "Sync error — data saved locally" : ""}
                style={{ width:"7px", height:"7px", borderRadius:"50%", marginTop:"3px",
                  background: syncStatus === "synced" ? "#27ae60" : syncStatus === "syncing" ? "#f5c842" : syncStatus === "error" ? "#c8102e" : "rgba(255,255,255,0.15)" }}>
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", alignItems:"center" }}>
          {lineupDirty ? (
            <button onClick={generateLineup} style={{ padding:"8px 16px", borderRadius:"6px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"11px", fontFamily:"inherit", letterSpacing:"0.08em", textTransform:"uppercase", background:"linear-gradient(135deg,#f5c842,#d4a017)", color:"#0f1f3d" }}>
              Generate Lineup
            </button>
          ) : null}
          <div style={S.tabs}>
            {TABS.map(function(t) {
              return <button key={t.key} style={S.tab(tab === t.key)} onClick={function(k) { return function() { setTab(k); }; }(t.key)}>{t.label}</button>;
            })}
          </div>
        </div>
      </div>
      <div style={S.body}>
        {tabContent}
      </div>
    </div>
  );
}
