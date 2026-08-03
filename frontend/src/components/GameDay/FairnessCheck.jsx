/**
 * FairnessCheck
 * Extracted from App.jsx v1.6.9
 * Post-finalization fairness signal card shown in the Defense tab when lineup is locked.
 * Computes three checks from roster + grid and displays pass/fail for each.
 * Props:
 *   roster  {Array}   array of player objects with .name property
 *   grid    {object}  player name → array of position strings per inning
 *
 * Phase 3 Step 5+ / var C retirement: no longer takes a `C` prop. `C.text` maps
 * 1:1 to tokens.color.text.ink (already the established equivalence, Story 114).
 * `C.border` is App.jsx's legacy rgba(0,0,0,0.06) value, which has no token
 * equivalent - tokens.color.border.default (#E2E8F0) is a real, visible drift
 * (rejected for the same reason Story 117 rejected it for S.card). Kept as the
 * exact raw literal instead of silently drifting onto the token.
 */

import { tokens } from "../../theme/tokens";
import { Card } from "../ui/Card";

export function FairnessCheck({ roster, grid }) {
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
    <Card padding="12px 14px" radius="md" style={{
      border: "1px solid rgba(0,0,0,0.06)",
      borderLeft: "4px solid " + (allPass ? tokens.color.status.success : tokens.color.status.warning),
      marginBottom: "14px",
      boxShadow: tokens.shadow.subtle,
    }}>
      <div style={{ fontSize:tokens.font.size.body, fontWeight:tokens.font.weight.bold, marginBottom:tokens.space.sm,
        color: allPass ? tokens.color.status.success : tokens.color.status.warning }}>
        {allPass ? "✅ Fairness Check Passed" : "⚠️ Fairness Check — " + failCount + " issue" + (failCount !== 1 ? "s" : "")}
      </div>
      {checks.map(function(ch) {
        return (
          <div key={ch.label} style={{ fontSize:tokens.font.size.md, color: ch.pass ? tokens.color.text.ink : tokens.color.brand.red, marginBottom:"3px" }}>
            {ch.pass ? "✅" : "❌"} {ch.label}
          </div>
        );
      })}
    </Card>
  );
}
