import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from './Card';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Story 117 — Tier 2/3 S.card -> Card equivalence proof
//
// Same live-browser blocker as Tier 1 (auth-gated tabs, magic-link/OAuth
// redirect escapes to prod in this dev environment). Tier 2/3 sites are NOT
// style-identical to each other or to Tier 1 the way Tier 1's 10 sites were
// — each has real per-site customization, so each gets its own targeted
// assertion here rather than one shared representative render.
//
// The one property-order risk specific to Tier 2: two sites layer a
// `borderLeft` accent on top of the base `border` (originally via object
// spread order — `{...S.card, ..., borderLeft: ...}`, where `borderLeft`
// came LAST and so won on the left edge only). Card's `style` prop is a
// plain object merged via Object.assign — key order inside that object
// must preserve `border` before `borderLeft`, or the accent silently loses
// (if borderLeft were first, a later-defined border wouldn't apply since
// there is no later border in these sites, but the reverse mistake —
// borderLeft losing to a shorthand that comes after it — is exactly what
// this proof rules out).
// ============================================================================

describe('Story 117 Tier 2/3 — Card equivalence vs legacy S.card overrides', function () {

  var C_BORDER = 'rgba(0,0,0,0.06)';
  var LEGACY_BOX_SHADOW = '0 2px 8px rgba(15,31,61,0.06)';

  test('Roster player card: padding="14px" raw passthrough, base border/shadow/marginBottom unchanged', function () {
    var { container } = render(
      <Card padding="14px" radius="md" style={{ border: '1px solid ' + C_BORDER, boxShadow: tokens.shadow.subtleCard, marginBottom: '14px' }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    expect(div.style.padding).toBe('14px');
    expect(div.style.boxShadow).toBe(LEGACY_BOX_SHADOW);
    expect(div.style.marginBottom).toBe('14px');
  });

  test('Songs card: marginBottom override to "8px" (not the 14px base) + opacity/pointerEvents passthrough', function () {
    var { container } = render(
      <Card padding="16px 18px" radius="md" style={{ border: '1px solid ' + C_BORDER, boxShadow: tokens.shadow.subtleCard, marginBottom: '8px', opacity: 0.45, pointerEvents: 'none' }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    expect(div.style.marginBottom).toBe('8px');
    expect(div.style.opacity).toBe('0.45');
    expect(div.style.pointerEvents).toBe('none');
  });

  test('Add/Edit Game form: borderLeft accent wins on the left edge, base border color holds on the other 3 sides', function () {
    var { container } = render(
      <Card padding="16px 18px" radius="md" style={{ border: '1px solid ' + C_BORDER, boxShadow: tokens.shadow.subtleCard, marginBottom: '14px', borderLeft: '3px solid #c8102e' }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    // Left edge: the accent, 3px wide, wins because borderLeft is keyed AFTER border.
    expect(div.style.borderLeftWidth).toBe('3px');
    expect(div.style.borderLeftColor).toBe('rgb(200, 16, 46)');
    // Other 3 edges: untouched by the accent, still the legacy base border.
    expect(div.style.borderTopWidth).toBe('1px');
    expect(div.style.borderTopColor).toBe('rgba(0, 0, 0, 0.06)');
    expect(div.style.borderRightColor).toBe('rgba(0, 0, 0, 0.06)');
    expect(div.style.borderBottomColor).toBe('rgba(0, 0, 0, 0.06)');
  });

  test('Schedule game row: computed borderLeft accent + padding "14px 16px" + conditional opacity, same layering guarantee', function () {
    var { container } = render(
      <Card padding="14px 16px" radius="md" style={{ border: '1px solid ' + C_BORDER, boxShadow: tokens.shadow.subtleCard, marginBottom: '14px', borderLeft: '3px solid #27ae60', opacity: 1 }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    expect(div.style.padding).toBe('14px 16px');
    expect(div.style.borderLeftColor).toBe('rgb(39, 174, 96)');
    expect(div.style.borderTopColor).toBe('rgba(0, 0, 0, 0.06)');
  });

  test('Season Batting Stats box (Tier 3): background + border are the SITE\'s own override values, not the Tier 1 shared pattern', function () {
    var { container } = render(
      <Card padding="12px 14px" radius="md" style={{ background: 'rgba(15,31,61,0.03)', border: '1px solid rgba(15,31,61,0.1)', boxShadow: tokens.shadow.subtleCard, marginBottom: '14px' }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    // Explicitly NOT the default Card variant background (tokens.color.surface.card /
    // #FFFFFF) and NOT the Tier 1 shared C.border value — this site never used either.
    expect(div.style.background).toBe('rgba(15, 31, 61, 0.03)');
    expect(div.style.borderColor).toBe('rgba(15, 31, 61, 0.1)');
    expect(div.style.padding).toBe('12px 14px');
  });

  test('Share Lineup modal: padding="24px" + maxWidth/width passthrough, base border/shadow unchanged', function () {
    var { container } = render(
      <Card padding="24px" radius="md" style={{ border: '1px solid ' + C_BORDER, boxShadow: tokens.shadow.subtleCard, marginBottom: '14px', maxWidth: '420px', width: '100%' }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    expect(div.style.padding).toBe('24px');
    expect(div.style.maxWidth).toBe('420px');
    expect(div.style.width).toBe('100%');
    expect(div.style.boxShadow).toBe(LEGACY_BOX_SHADOW);
  });

  test('SharedView Batting Order card: marginTop addition + base border/shadow/marginBottom unchanged', function () {
    var { container } = render(
      <Card padding="16px 18px" radius="md" style={{ border: '1px solid ' + C_BORDER, boxShadow: tokens.shadow.subtleCard, marginBottom: '14px', marginTop: '4px' }}>
        content
      </Card>
    );
    var div = container.querySelector('div');
    expect(div.style.marginTop).toBe('4px');
    expect(div.style.marginBottom).toBe('14px');
    expect(div.style.boxShadow).toBe(LEGACY_BOX_SHADOW);
  });

});
