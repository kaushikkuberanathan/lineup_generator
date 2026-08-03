import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from './Card';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Story 117 — Tier 1 S.card -> Card equivalence proof
//
// Live browser verification of the 10 Tier 1 App.jsx call sites was blocked:
// all 6 affected tabs sit behind the auth gate, and the magic-link/OAuth
// redirect escapes to prod in this environment (no local-dev bypass exists).
// This is the substitute artifact: render the Card component with the EXACT
// prop signature used at all 10 migrated sites (verified identical via
// `git diff` — only each site's children differ, which does not affect the
// container's own computed style) and assert computed CSS against the
// original S.card literal values (App.jsx pre-migration, base object at
// what is now line 706-710 on origin/develop):
//
//   card: {
//     background:C.white, borderRadius:"10px", padding:"16px 18px",
//     boxShadow:"0 2px 8px rgba(15,31,61,0.06)", marginBottom:"14px",
//     border:"1px solid " + C.border   // C.border = "rgba(0,0,0,0.06)"
//   }
//
// Every property below must match EXACTLY except borderRadius, which is a
// deliberately accepted 10px -> 8px (radius="md") drift — the second
// instance of this exact drift (first: LegalSection.jsx, Story 64).
//
// This is not a substitute for having actually seen the rendered tabs — it
// proves the CSS the browser would compute, not that App.jsx's JSX wiring
// itself is free of some unrelated rendering bug. Combined with: a clean
// build (395 modules, 0 errors), a clean full test suite run (962 passed,
// 1 skipped, 963 total), clean lint (0 warnings), and a verified-identical
// diff across all 10 sites, this closes the loop that a live screenshot
// would otherwise close.
// ============================================================================

describe('Story 117 Tier 1 — Card equivalence vs legacy S.card', function () {

  var C_WHITE  = '#ffffff';
  var C_BORDER = 'rgba(0,0,0,0.06)';
  var LEGACY_BOX_SHADOW = '0 2px 8px rgba(15,31,61,0.06)';

  function renderTierOneSite() {
    return render(
      <Card
        padding="16px 18px"
        radius="md"
        style={{
          border: '1px solid ' + C_BORDER,
          boxShadow: tokens.shadow.subtleCard,
          marginBottom: '14px',
        }}
      >
        content
      </Card>
    );
  }

  test('background matches legacy C.white exactly', function () {
    var { container } = renderTierOneSite();
    // Card's default variant already resolves to tokens.color.surface.card,
    // which is byte-identical to C.white (#FFFFFF / #ffffff) — no drift here.
    expect(container.querySelector('div').style.background).toBe('rgb(255, 255, 255)');
  });

  test('border matches legacy C.border exactly (rejected the token-drift option)', function () {
    var { container } = renderTierOneSite();
    var div = container.querySelector('div');
    expect(div.style.borderWidth).toBe('1px');
    expect(div.style.borderStyle).toBe('solid');
    // rgba(0,0,0,0.06) is the TRUE legacy value — NOT tokens.color.border.default
    // (#E2E8F0 / rgb(226,232,240)), which was explicitly rejected as a drift.
    expect(div.style.borderColor).toBe('rgba(0, 0, 0, 0.06)');
  });

  test('boxShadow matches legacy S.card value exactly (tokens.shadow.subtleCard is an exact match)', function () {
    var { container } = renderTierOneSite();
    expect(container.querySelector('div').style.boxShadow).toBe(LEGACY_BOX_SHADOW);
    expect(tokens.shadow.subtleCard).toBe(LEGACY_BOX_SHADOW);
  });

  test('padding matches legacy "16px 18px" exactly (raw passthrough, Phase 0 capability)', function () {
    var { container } = renderTierOneSite();
    expect(container.querySelector('div').style.padding).toBe('16px 18px');
  });

  test('marginBottom matches legacy "14px" exactly', function () {
    var { container } = renderTierOneSite();
    expect(container.querySelector('div').style.marginBottom).toBe('14px');
  });

  test('borderRadius is the ACCEPTED drift: 8px (radius="md"), not the legacy 10px', function () {
    var { container } = renderTierOneSite();
    expect(container.querySelector('div').style.borderRadius).toBe(tokens.radius.md);
    expect(tokens.radius.md).toBe('8px');
    // Legacy S.card value was "10px" — no token matches it exactly (nearest:
    // sm 6px / md 8px / lg 12px). This is the second instance of accepting
    // the same 8px drift (first: LegalSection.jsx, Story 64) — a third
    // instance would be a signal `radius` needs a dedicated in-between value.
  });

});
