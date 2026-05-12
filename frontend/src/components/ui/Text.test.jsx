import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Phase 2 — Text primitive contract tests
//
// All tests are RED before Text.jsx exists (module resolution fails).
// Genuine RED checkpoint: run before creating Text.jsx.
// ============================================================================

describe('Text — Phase 2 primitive', function () {

  // ── Shape ─────────────────────────────────────────────────────────────────

  test('T1.1: renders children as a span by default', function () {
    var { container } = render(<Text>hello</Text>);
    expect(container.querySelector('span')).not.toBeNull();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  test('T1.2: as="p" renders a paragraph element', function () {
    var { container } = render(<Text as="p">paragraph</Text>);
    expect(container.querySelector('p')).not.toBeNull();
  });

  test('T1.3: as="h2" renders a heading element', function () {
    var { container } = render(<Text as="h2">heading</Text>);
    expect(container.querySelector('h2')).not.toBeNull();
  });

  test('T1.4: no props renders with no computed inline styles', function () {
    render(<Text>bare</Text>);
    var el = screen.getByText('bare');
    expect(el.style.fontSize).toBe('');
    expect(el.style.color).toBe('');
    expect(el.style.fontWeight).toBe('');
  });

  // ── size → token ──────────────────────────────────────────────────────────

  test('T1.5: size="xs" renders 11px (tokens.font.size.xs — WCAG floor)', function () {
    render(<Text size="xs">text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('11px');
  });

  test('T1.6: size="sm" renders 12px (tokens.font.size.sm)', function () {
    render(<Text size="sm">text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('12px');
  });

  test('T1.7: size="body" renders 13px (tokens.font.size.body)', function () {
    render(<Text size="body">text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('13px');
  });

  test('T1.8: size="md" renders 14px (tokens.font.size.md)', function () {
    render(<Text size="md">text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('14px');
  });

  test('T1.9: size="lg" renders 16px (tokens.font.size.lg)', function () {
    render(<Text size="lg">text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('16px');
  });

  test('T1.10: size="xl" renders 18px (tokens.font.size.xl)', function () {
    render(<Text size="xl">text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('18px');
  });

  // ── weight → token ────────────────────────────────────────────────────────

  test('T1.11: weight="regular" renders fontWeight 400', function () {
    render(<Text weight="regular">text</Text>);
    expect(screen.getByText('text').style.fontWeight).toBe('400');
  });

  test('T1.12: weight="semibold" renders fontWeight 600', function () {
    render(<Text weight="semibold">text</Text>);
    expect(screen.getByText('text').style.fontWeight).toBe('600');
  });

  test('T1.13: weight="bold" renders fontWeight 700', function () {
    render(<Text weight="bold">text</Text>);
    expect(screen.getByText('text').style.fontWeight).toBe('700');
  });

  // ── color → token (JSDOM normalizes hex → rgb) ───────────────────────────

  test('T1.14: color="secondary" → tokens.color.text.secondary (#64748b = rgb(100,116,139))', function () {
    render(<Text color="secondary">text</Text>);
    expect(screen.getByText('text').style.color).toBe('rgb(100, 116, 139)');
  });

  test('T1.15: color="tertiary" → tokens.color.text.tertiary (#94a3b8 = rgb(148,163,184))', function () {
    render(<Text color="tertiary">text</Text>);
    expect(screen.getByText('text').style.color).toBe('rgb(148, 163, 184)');
  });

  test('T1.16: color="disabled" → tokens.color.text.disabled (#9ca3af = rgb(156,163,175))', function () {
    render(<Text color="disabled">text</Text>);
    expect(screen.getByText('text').style.color).toBe('rgb(156, 163, 175)');
  });

  test('T1.17: color="navy" → tokens.color.brand.navy (#0f1f3d = rgb(15,31,61))', function () {
    render(<Text color="navy">text</Text>);
    expect(screen.getByText('text').style.color).toBe('rgb(15, 31, 61)');
  });

  test('T1.18: color="gold" → tokens.color.brand.gold (#f5c842 = rgb(245,200,66))', function () {
    render(<Text color="gold">text</Text>);
    expect(screen.getByText('text').style.color).toBe('rgb(245, 200, 66)');
  });

  test('T1.19: color="white" renders #ffffff (rgb(255,255,255))', function () {
    render(<Text color="white">text</Text>);
    expect(screen.getByText('text').style.color).toBe('rgb(255, 255, 255)');
  });

  test('T1.20: color="inherit" renders inherit', function () {
    render(<Text color="inherit">text</Text>);
    expect(screen.getByText('text').style.color).toBe('inherit');
  });

  // ── family → token ────────────────────────────────────────────────────────

  test('T1.21: family="serif" renders Georgia stack (tokens.font.family.serif)', function () {
    render(<Text family="serif">text</Text>);
    // JSDOM normalizes: single quotes → double quotes, spaces added after commas
    expect(screen.getByText('text').style.fontFamily).toBe('Georgia, "Times New Roman", serif');
  });

  test('T1.22: family="sans" renders system stack (tokens.font.family.sans)', function () {
    render(<Text family="sans">text</Text>);
    // JSDOM normalizes: single quotes → double quotes, spaces added after commas
    expect(screen.getByText('text').style.fontFamily).toBe('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
  });

  // ── uppercase ─────────────────────────────────────────────────────────────

  test('T1.23: uppercase prop sets textTransform uppercase', function () {
    render(<Text uppercase>text</Text>);
    expect(screen.getByText('text').style.textTransform).toBe('uppercase');
  });

  test('T1.24: without uppercase prop textTransform is unset', function () {
    render(<Text>text</Text>);
    expect(screen.getByText('text').style.textTransform).toBe('');
  });

  // ── style escape hatch ────────────────────────────────────────────────────

  test('T1.25: style prop merges with token-computed styles', function () {
    render(<Text size="body" style={{ marginTop: '8px' }}>text</Text>);
    var el = screen.getByText('text');
    expect(el.style.fontSize).toBe('13px');
    expect(el.style.marginTop).toBe('8px');
  });

  test('T1.26: style prop can override token values when explicitly set', function () {
    render(<Text size="body" style={{ fontSize: '20px' }}>text</Text>);
    expect(screen.getByText('text').style.fontSize).toBe('20px');
  });

});
