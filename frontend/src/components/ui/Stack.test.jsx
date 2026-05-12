import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from './Stack';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Phase 2 — Stack primitive contract tests
//
// Stack replaces raw flex boilerplate. App.jsx alone has ~182 display:flex
// sites — Stack is the primary Phase 3 migration target.
//
// Architectural invariants enforced by this suite:
//   - Renders a <div> with display:flex — always
//   - direction default is "col" (vertical stack, dominant call-site pattern)
//   - Props use a CLOSED vocabulary: "col"/"row", "start"/"end"/"between"/etc.
//     All map to CSS values — none are passed through verbatim. This is the
//     critical contract: if any map breaks (e.g. "col" leaks as flexDirection
//     value), the explicit mapping tests catch it.
//   - Children render as-is — no inner wrapper, no Text primitive
//   - Not interactive — no onClick, no disabled, no 44px floor
//
// JSDOM normalization: no hex colors used here. All style values are CSS
// strings (flex values, token px values) — no rgb/rgba conversion needed.
// The same font-family/border conventions from Button.test.jsx do not apply.
//
// Deferred (Phase 2.5+): as prop, Stack.Spacer / Stack.Divider,
//   responsive direction, wrap-reverse, padding/margin props.
// ============================================================================

describe('Stack — Phase 2 primitive', function () {

  // ── Shape ─────────────────────────────────────────────────────────────────

  test('S1.1: renders a div element', function () {
    var { container } = render(<Stack>content</Stack>);
    expect(container.querySelector('div')).not.toBeNull();
  });

  test('S1.2: always sets display:flex', function () {
    var { container } = render(<Stack>content</Stack>);
    expect(container.querySelector('div').style.display).toBe('flex');
  });

  // ── Direction: default + string mapping ───────────────────────────────────

  test('S2.1: default direction is "col" → flexDirection "column" (not "col")', function () {
    var { container } = render(<Stack>content</Stack>);
    // "col" is the prop value — CSS requires "column". If this passes "col"
    // verbatim, JSDOM ignores the invalid value and style is unset ("").
    expect(container.querySelector('div').style.flexDirection).toBe('column');
  });

  test('S2.2: direction="row" → flexDirection "row"', function () {
    var { container } = render(<Stack direction="row">content</Stack>);
    expect(container.querySelector('div').style.flexDirection).toBe('row');
  });

  // ── Gap → tokens.space.* ──────────────────────────────────────────────────

  test('S3.1: gap="xs" → tokens.space.xs (4px)', function () {
    var { container } = render(<Stack gap="xs">content</Stack>);
    expect(container.querySelector('div').style.gap).toBe(tokens.space.xs);
  });

  test('S3.2: gap="sm" → tokens.space.sm (8px)', function () {
    var { container } = render(<Stack gap="sm">content</Stack>);
    expect(container.querySelector('div').style.gap).toBe(tokens.space.sm);
  });

  test('S3.3: gap="md" → tokens.space.md (12px)', function () {
    var { container } = render(<Stack gap="md">content</Stack>);
    expect(container.querySelector('div').style.gap).toBe(tokens.space.md);
  });

  test('S3.4: gap="lg" → tokens.space.lg (16px)', function () {
    var { container } = render(<Stack gap="lg">content</Stack>);
    expect(container.querySelector('div').style.gap).toBe(tokens.space.lg);
  });

  // ── Align → alignItems (closed vocabulary, non-obvious mappings tested) ───

  test('S4.1: align="start" → alignItems "flex-start" (not "start")', function () {
    var { container } = render(<Stack align="start">content</Stack>);
    // "start" is not a valid alignItems value in all browsers — must map to "flex-start"
    expect(container.querySelector('div').style.alignItems).toBe('flex-start');
  });

  test('S4.2: align="center" → alignItems "center"', function () {
    var { container } = render(<Stack align="center">content</Stack>);
    expect(container.querySelector('div').style.alignItems).toBe('center');
  });

  test('S4.3: align="end" → alignItems "flex-end" (not "end")', function () {
    var { container } = render(<Stack align="end">content</Stack>);
    expect(container.querySelector('div').style.alignItems).toBe('flex-end');
  });

  test('S4.4: align="stretch" → alignItems "stretch"', function () {
    var { container } = render(<Stack align="stretch">content</Stack>);
    expect(container.querySelector('div').style.alignItems).toBe('stretch');
  });

  test('S4.5: no align prop → alignItems is absent (empty string, browser default applies)', function () {
    var { container } = render(<Stack>content</Stack>);
    // Guard: if anyone adds alignItems:'stretch' to BASE, this goes RED immediately.
    expect(container.querySelector('div').style.alignItems).toBe('');
  });

  // ── Justify → justifyContent (non-obvious mappings are the critical tests) ─

  test('S5.1: justify="between" → justifyContent "space-between" (not "between")', function () {
    var { container } = render(<Stack justify="between">content</Stack>);
    // Most likely to break — "between" is not a CSS value; must expand to "space-between"
    expect(container.querySelector('div').style.justifyContent).toBe('space-between');
  });

  test('S5.2: justify="around" → justifyContent "space-around" (not "around")', function () {
    var { container } = render(<Stack justify="around">content</Stack>);
    expect(container.querySelector('div').style.justifyContent).toBe('space-around');
  });

  test('S5.3: justify="center" → justifyContent "center"', function () {
    var { container } = render(<Stack justify="center">content</Stack>);
    expect(container.querySelector('div').style.justifyContent).toBe('center');
  });

  test('S5.4: no justify prop → justifyContent is absent (empty string, browser default applies)', function () {
    var { container } = render(<Stack>content</Stack>);
    // Guard: if anyone adds justifyContent:'flex-start' to BASE, this goes RED immediately.
    expect(container.querySelector('div').style.justifyContent).toBe('');
  });

  // ── Wrap (boolean) ────────────────────────────────────────────────────────

  test('S6.1: wrap={true} → flexWrap "wrap"', function () {
    var { container } = render(<Stack wrap={true}>content</Stack>);
    expect(container.querySelector('div').style.flexWrap).toBe('wrap');
  });

  test('S6.2: wrap omitted (default false) → flexWrap "nowrap"', function () {
    var { container } = render(<Stack>content</Stack>);
    expect(container.querySelector('div').style.flexWrap).toBe('nowrap');
  });

  // ── Children render unmodified ────────────────────────────────────────────

  test('S7.1: children render directly — string child is text node, no inner wrapper', function () {
    var { container } = render(<Stack>hello</Stack>);
    var div = container.querySelector('div');
    expect(div.firstChild.nodeType).toBe(3); // TEXT_NODE — no span/div wrapper injected
    expect(div.querySelector('span')).toBeNull();
  });

  // ── Style escape hatch ────────────────────────────────────────────────────

  test('S8.1: style prop merges with computed styles — both survive', function () {
    var { container } = render(<Stack gap="md" style={{ padding: '8px' }}>content</Stack>);
    var div = container.querySelector('div');
    expect(div.style.gap).toBe(tokens.space.md);
    expect(div.style.padding).toBe('8px');
  });

});
