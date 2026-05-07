import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BattingHandSelector } from './BattingHandSelector';

// ============================================================================
// R1 Roster Polish — BattingHandSelector token characterization tests
//
// Token applications:
//   BASE_STYLE.borderRadius → tokens.radius.sm   (6px)
//   BASE_STYLE.fontSize     → tokens.font.size.sm (12px)
//   gap                     → tokens.space.sm      (8px)
//   INACTIVE_STYLE.bg       → tokens.color.surface.card (#ffffff — same value)
//
// NOTE — active background (#16a34a) has no exact token match.
//   tokens.color.status.success = #27AE60 would be a visual change; left
//   as literal pending design decision. Flag in token drift audit.
// ============================================================================

// analytics.track is a side-effect — stub it so no real calls fire in tests
vi.mock('../utils/analytics', function() {
  return { track: vi.fn() };
});

describe('BattingHandSelector — R1 token characterization', function () {

  // ── Functional ───────────────────────────────────────────────────────────

  test('R2.1: renders three option buttons', function () {
    render(<BattingHandSelector value="R" onChange={() => {}} teamId="test" />);
    var buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  test('R2.2: clicking a button calls onChange with the correct value', function () {
    var onChange = vi.fn();
    render(<BattingHandSelector value="R" onChange={onChange} teamId="test" />);
    fireEvent.click(screen.getByText('Left'));
    expect(onChange).toHaveBeenCalledWith('L');
  });

  test('R2.3: active button receives active styles', function () {
    var { container } = render(
      <BattingHandSelector value="L" onChange={() => {}} teamId="test" />
    );
    var buttons = container.querySelectorAll('button');
    var leftBtn = buttons[1]; // Left is index 1
    // Active background is #16a34a — no exact token; assert literal rgb value
    // JSDOM normalizes hex: #16a34a = rgb(22, 163, 74)
    expect(leftBtn.style.background).toBe('rgb(22, 163, 74)');
  });

  test('R2.4: inactive button background is surface.card (#ffffff)', function () {
    var { container } = render(
      <BattingHandSelector value="R" onChange={() => {}} teamId="test" />
    );
    var buttons = container.querySelectorAll('button');
    var leftBtn = buttons[1]; // Left is inactive when value="R"
    // tokens.color.surface.card = #FFFFFF = rgb(255, 255, 255)
    expect(leftBtn.style.background).toBe('rgb(255, 255, 255)');
  });

  // ── Style: values must match token equivalents ────────────────────────────

  test('R2.5: button border-radius is 6px (tokens.radius.sm)', function () {
    var { container } = render(
      <BattingHandSelector value="R" onChange={() => {}} teamId="test" />
    );
    var btn = container.querySelector('button');
    expect(btn.style.borderRadius).toBe('6px');
  });

  test('R2.6: button font-size is 12px (tokens.font.size.sm)', function () {
    var { container } = render(
      <BattingHandSelector value="R" onChange={() => {}} teamId="test" />
    );
    var btn = container.querySelector('button');
    expect(btn.style.fontSize).toBe('12px');
  });

  test('R2.7: container gap is 8px (tokens.space.sm)', function () {
    var { container } = render(
      <BattingHandSelector value="R" onChange={() => {}} teamId="test" />
    );
    var wrapper = container.querySelector('div');
    expect(wrapper.style.gap).toBe('8px');
  });

});
