// Engine constants — positions, skills, tags, batting skills, defaults, schedule
// Pure data. No functions. No side effects.

export var COUNTY_SCHEDULE_URL = "https://forsythcounty.kaizendemos.app/schedule/2026-youth-baseball-and-softball-mmt6617n";

export var ALL_POSITIONS    = ["P","C","1B","2B","3B","SS","LF","CF","RF","Bench"];
export var FIELD_POSITIONS  = ["P","C","1B","2B","3B","SS","LF","CF","RF"];
export var INFIELD          = ["P","C","1B","2B","3B","SS"];
export var OUTFIELD         = ["LF","CF","RF"];

export var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", CF:"#27ae60",
  RF:"#239b56", Bench:"#555"
};

// Skill badges - fielding only
// ── FIELDING SKILLS (ability) ──────────────────────────────────────────────
// Each key must survive across saved rosters — do not rename existing keys.
// Adding new keys is safe; removing/renaming breaks saved data.
export var SKILLS = {
  // Fielding Ability
  strongArm:      { label:"Strong Arm",       group:"Fielding",    color:"#2980b9", weights:{ P:18,SS:16,"3B":15,"2B":13,CF:12,"1B":8,LF:7,RF:7,C:6 } },
  goodGlove:      { label:"Good Glove",       group:"Fielding",    color:"#16a085", weights:{ SS:18,"2B":16,"3B":14,"1B":12,CF:10,C:8,P:6,LF:5,RF:5 } },
  accurateThrower:{ label:"Accurate Throw",   group:"Fielding",    color:"#2471a3", weights:{ P:16,SS:14,"3B":13,"2B":11,CF:10,"1B":6,LF:5,RF:5,C:8 } },
  quickRelease:   { label:"Quick Release",    group:"Fielding",    color:"#1a5276", weights:{ C:18,SS:14,"2B":13,"3B":10,P:12,"1B":7,CF:8,LF:4,RF:4 } },
  naturalCatcher: { label:"Natural Catcher",  group:"Fielding",    color:"#7f3f3f", weights:{ C:22,"1B":10,"3B":6,SS:4,"2B":4,P:4,LF:2,CF:1,RF:2 } },
  bigKid:         { label:"Big/Strong",       group:"Fielding",    color:"#c0392b", weights:{ "1B":20,C:14,"3B":12,LF:8,RF:8,"2B":5,SS:3,CF:4,P:6 } },
  leftHanded:     { label:"Left Handed",      group:"Fielding",    color:"#d4a017", weights:{ "1B":22,LF:14,P:12,CF:10,RF:10,"3B":2,"2B":1,SS:1,C:1 } },
  // Game IQ
  gameAware:      { label:"Knows Where to Throw", group:"Game IQ", color:"#e05c2a", weights:{ P:20,SS:18,"2B":10,"3B":9,"1B":7,C:4,CF:3,LF:1,RF:1 } },
  callsForBall:   { label:"Calls for Ball",   group:"Game IQ",     color:"#d35400", weights:{ CF:18,SS:14,"2B":12,"3B":10,P:10,C:6,"1B":4,LF:8,RF:8 } },
  backsUpPlays:   { label:"Backs Up Plays",   group:"Game IQ",     color:"#ca6f1e", weights:{ P:14,CF:13,SS:12,"2B":10,"3B":8,"1B":6,C:4,LF:6,RF:6 } },
  // Effort and Behavior
  highEnergy:     { label:"High Energy",      group:"Effort",      color:"#f39c12", weights:{ P:14,SS:13,CF:13,"2B":11,"3B":10,"1B":8,C:8,LF:5,RF:5 } },
  hustles:        { label:"Hustles Always",   group:"Effort",      color:"#e67e22", weights:{ CF:12,SS:11,"2B":10,"3B":9,P:8,"1B":7,C:6,LF:7,RF:7 } },
  developing:     { label:"Developing",       group:"Effort",      color:"#8e44ad", weights:{ LF:16,RF:16,C:14,CF:12,"1B":6,"2B":3,"3B":3,SS:1,P:1 } },
  // Base Running
  fastRunner:     { label:"Fast Runner",      group:"Base Running",color:"#27ae60", weights:{ CF:20,SS:16,"2B":14,LF:10,RF:10,P:8,"3B":7,"1B":5,C:2 } },
  smartOnBases:   { label:"Smart on Bases",   group:"Base Running",color:"#1e8449", weights:{ SS:12,CF:11,"2B":10,"3B":8,P:8,"1B":6,LF:7,RF:7,C:4 } },
  // Legacy key preserved for backward compatibility with saved rosters
  needsRoutine:   { label:"Needs Routine (Legacy)", group:"Fielding", color:"#7f8c8d", weights:{ "1B":16,RF:14,LF:14,C:8,"3B":6,CF:6,"2B":5,SS:3,P:2 } }
};

// ── COACH NOTES / BEHAVIOR TAGS ───────────────────────────────────────────
// Tags affect position scoring (mods) and bench selection (benchOnce).
// Grouped for display — group field used by the UI only.
export var TAGS = {
  // Confidence
  confidentPlayer:      { label:"Confident",       group:"Confidence",   color:"#27ae60", mods:{ P:10,SS:7,C:9,"2B":3,"3B":4,"1B":2,CF:2,LF:1,RF:1 } },
  fearfulOfBall:        { label:"Fearful of Ball",  group:"Confidence",   color:"#7f8c8d", mods:{ LF:10,RF:10,"1B":5,CF:-2,C:-14,P:-14,SS:-8,"2B":-6,"3B":-8 } },
  hesitates:            { label:"Hesitates",        group:"Confidence",   color:"#95a5a6", mods:{ P:-10,SS:-8,C:-8,CF:-4,"2B":-4,"3B":-4,"1B":4,LF:6,RF:6 } },
  // Effort and Behavior (coach-observed)
  goodCoachability:     { label:"Coachable",        group:"Behavior",     color:"#2ecc71", mods:{ P:4,SS:3,C:4,"2B":4,"3B":4,"1B":4,CF:3,LF:3,RF:3 } },
  inconsistentAttention:{ label:"Needs Focus",      group:"Behavior",     color:"#8e44ad", mods:{ RF:8,LF:8,"1B":5,P:-12,SS:-10,C:-8,CF:-4,"2B":-4,"3B":-4 } },
  // Physical / Throwing
  weakThrower:          { label:"Weak Thrower",     group:"Physical",     color:"#e74c3c", mods:{ P:-16,SS:-12,"3B":-10,"2B":-6,"1B":5,LF:5,RF:5,CF:-2,C:-4 } },
  slowRunner:           { label:"Slow Runner",      group:"Physical",     color:"#bdc3c7", mods:{ "1B":8,C:5,LF:3,RF:3,CF:-8,SS:-5,"2B":-3,"3B":-2,P:-1 } },
  // Base Running coaching
  needsBaseCoaching:    { label:"Needs Base Coaching", group:"Base Running", color:"#e67e22", mods:{ SS:-2,"2B":-2,CF:-2,P:-2,"3B":-1,"1B":4,LF:3,RF:3,C:2 } },
  // Lineup control
  benchOnce:            { label:"Bench Once Only",  group:"Lineup",       color:"#f5c842", mods:{} },
  absent:               { label:"Out This Game",     group:"Lineup",       color:"#e74c3c", mods:{} }
};

// Batting skills
export var BAT_SKILLS = {
  contactHitter:  { label:"Contact",    color:"#d4a017", bonus:3 },
  powerHitter:    { label:"Power",      color:"#c8102e", bonus:4 },
  patientEye:     { label:"Patient",    color:"#2980b9", bonus:5 },
  fastBaseRunner: { label:"Fast",       color:"#27ae60", bonus:5 },
  clutch:         { label:"Clutch",     color:"#e05c2a", bonus:2 },
  freeSwinger:    { label:"Free Swing", color:"#8e44ad", bonus:-3 },
  slowBat:        { label:"Slow Bat",   color:"#7f8c8d", bonus:-2 },
  nervous:        { label:"Nervous",    color:"#95a5a6", bonus:-2 }
};

export var DISLIKE_PENALTY = -50;

// Default roster
export var DEFAULT_ROSTER = [
  { name:"Aiden",    skills:["gameAware"],                    tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Benji",    skills:["strongArm","goodGlove"],        tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Cassius",  skills:["developing"],                   tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Connor",   skills:["developing"],                   tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Eshaan",   skills:["gameAware","strongArm"],        tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Ezra",     skills:["strongArm"],                    tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Jackson",  skills:["gameAware","fastRunner"],       tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Leighton", skills:["gameAware","goodGlove"],        tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Levi",     skills:["strongArm"],                    tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Myles",    skills:["strongArm","goodGlove"],        tags:[], dislikes:[], prefs:[], batSkills:[] },
  { name:"Ranvir",   skills:["gameAware","strongArm"],        tags:[], dislikes:[], prefs:[], batSkills:[] }
];

export var MUD_HENS_SCHEDULE = [
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
