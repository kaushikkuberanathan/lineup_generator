/**
 * FairnessCheck
 * Extracted from App.jsx v1.6.9
 * Post-finalization fairness signal card shown in the Defense tab when lineup is locked.
 * Computes three checks from roster + grid and displays pass/fail for each.
 * Props:
 *   roster  {Array}   array of player objects with .name property
 *   grid    {object}  player name → array of position strings per inning
 *   C       {object}  color/theme constants (C.white, C.border, C.text, C.red)
 */

export function FairnessCheck({ roster, grid, C }) {
  var pcCounts = roster.map(function(p) {
    return (grid[p.name] || []).filter(function(pos) { return pos === "P" || pos === "C"; }).length;
  });
  var totalPC = pcCounts.reduce(function(s, x) { return s + x; }, 0);
  var avgPC = roster.length > 0 ? totalPC / roster.length : 0;

  // CHANGE 1: flag bench > 1 (was bench === 0)
  var benchViolator = null, benchViolatorCount = 0;
  roster.forEach(function(p) {
    if (benchViolator) return;
    var count = (grid[p.name] || []).filter(function(pos) { return pos === "Bench"; }).length;
    if (count > 1) { benchViolator = p.name; benchViolatorCount = count; }
  });
  var checkA = benchViolator === null;

  var checkB = avgPC === 0 || pcCounts.every(function(c) { return c <= Math.max(2 * avgPC, 1); });

  // CHANGE 2: consecutive C only (was P or C)
  var consecCViolator = null;
  roster.forEach(function(p) {
    if (consecCViolator) return;
    var asgn = grid[p.name] || [];
    for (var i = 0; i < asgn.length - 1; i++) {
      if (asgn[i] === "C" && asgn[i + 1] === "C") { consecCViolator = p.name; break; }
    }
  });
  var checkC = consecCViolator === null;

  // BONUS: catcher assigned more than once total
  var catcherViolator = null, catcherViolatorCount = 0;
  roster.forEach(function(p) {
    if (catcherViolator) return;
    var count = (grid[p.name] || []).filter(function(pos) { return pos === "C"; }).length;
    if (count > 1) { catcherViolator = p.name; catcherViolatorCount = count; }
  });
  var checkD = catcherViolator === null;

  var allPass = checkA && checkB && checkC && checkD;
  var failCount = [checkA, checkB, checkC, checkD].filter(function(c) { return !c; }).length;
  var checks = [
    { pass: checkA, label: checkA
        ? "No player benched more than once"
        : benchViolator + " is benched " + benchViolatorCount + " times — no player should bench more than once" },
    { pass: checkB, label: "Positions balanced" },
    { pass: checkC, label: checkC
        ? "No back-to-back catching"
        : consecCViolator + " catches back-to-back innings — rotate the catcher each inning" },
    { pass: checkD, label: checkD
        ? "No player catches more than once"
        : catcherViolator + " catches " + catcherViolatorCount + " innings — catcher should only catch once per game" },
  ];

  return (
    <div style={{ background:C.white, borderRadius:"8px", border:"1px solid " + C.border,
      borderLeft:"4px solid " + (allPass ? "#27ae60" : "#d4a017"),
      padding:"12px 14px", marginBottom:"14px",
      boxShadow:"0 1px 4px rgba(15,31,61,0.06)" }}>
      <div style={{ fontSize:"13px", fontWeight:"bold", marginBottom:"8px",
        color: allPass ? "#27ae60" : "#d4a017" }}>
        {allPass ? "✅ Fairness Check Passed" : "⚠️ Fairness Check — " + failCount + " issue" + (failCount !== 1 ? "s" : "")}
      </div>
      {checks.map(function(ch) {
        return (
          <div key={ch.label} style={{ fontSize:"14px", color: ch.pass ? C.text : C.red, marginBottom:"3px" }}>
            {ch.pass ? "✅" : "❌"} {ch.label}
          </div>
        );
      })}
    </div>
  );
}
