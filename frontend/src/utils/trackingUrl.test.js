// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { trackingUrl, outboundLinkProps, CAMPAIGNS, CONTENT } from './trackingUrl.js';

// ---------------------------------------------------------------------------
// Helpers to control display-mode detection across tests
// ---------------------------------------------------------------------------

function setStandalone(value) {
  Object.defineProperty(window.navigator, 'standalone', {
    value,
    configurable: true,
    writable: true,
  });
}

function setMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(display-mode: standalone)' ? matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// ---------------------------------------------------------------------------
// Group 1 — trackingUrl
// ---------------------------------------------------------------------------

describe('trackingUrl', () => {
  beforeEach(() => {
    setStandalone(undefined);
    setMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appends utm_source=dugoutlineup', () => {
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_source')).toBe('dugoutlineup');
  });

  it('appends utm_medium=web when not in standalone mode', () => {
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_medium')).toBe('web');
  });

  it('appends utm_medium=pwa when navigator.standalone is true', () => {
    setStandalone(true);
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_medium')).toBe('pwa');
  });

  it('appends utm_medium=pwa when display-mode matchMedia returns standalone', () => {
    setMatchMedia(true);
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_medium')).toBe('pwa');
  });

  it('appends utm_campaign with the provided campaign value', () => {
    const result = trackingUrl('https://example.com', { campaign: CAMPAIGNS.SHARON_SPRINGS });
    expect(new URL(result).searchParams.get('utm_campaign')).toBe('sharon_springs');
  });

  it('defaults utm_campaign to general when no campaign is provided', () => {
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_campaign')).toBe('general');
  });

  it('appends utm_content when content is a non-empty string', () => {
    const result = trackingUrl('https://example.com', { content: CONTENT.SCHEDULE_TAB });
    expect(new URL(result).searchParams.get('utm_content')).toBe('schedule_tab');
  });

  it('does NOT append utm_content when content is an empty string', () => {
    const result = trackingUrl('https://example.com', { content: '' });
    expect(new URL(result).searchParams.has('utm_content')).toBe(false);
  });

  it('does NOT append utm_content when content is omitted', () => {
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.has('utm_content')).toBe(false);
  });

  it('preserves existing query params on the destination URL', () => {
    const result = trackingUrl('https://example.com/page?ref=foo&tab=bar');
    const u = new URL(result);
    expect(u.searchParams.get('ref')).toBe('foo');
    expect(u.searchParams.get('tab')).toBe('bar');
    expect(u.searchParams.get('utm_source')).toBe('dugoutlineup');
  });

  it('returns the original url unchanged for a malformed input (never crashes)', () => {
    const bad = 'not-a-valid-url';
    expect(trackingUrl(bad)).toBe(bad);
  });

  it('returns the original url unchanged for an empty string (never crashes)', () => {
    expect(trackingUrl('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Group 2 — outboundLinkProps
// ---------------------------------------------------------------------------

describe('outboundLinkProps', () => {
  beforeEach(() => {
    setStandalone(undefined);
    setMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an object with href, target, rel, and onClick', () => {
    const props = outboundLinkProps('https://example.com');
    expect(props).toHaveProperty('href');
    expect(props).toHaveProperty('target', '_blank');
    expect(props).toHaveProperty('rel', 'noopener noreferrer');
    expect(props).toHaveProperty('onClick');
    expect(typeof props.onClick).toBe('function');
  });

  it('href contains utm params from trackingUrl', () => {
    const props = outboundLinkProps('https://example.com', { campaign: CAMPAIGNS.COUNTY_LEAGUE });
    const u = new URL(props.href);
    expect(u.searchParams.get('utm_source')).toBe('dugoutlineup');
    expect(u.searchParams.get('utm_campaign')).toBe('county_league');
  });

  it('onClick does not throw', () => {
    const props = outboundLinkProps('https://example.com');
    expect(() => props.onClick()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Group 3 — getDisplayMedium (via trackingUrl, since it is not exported)
// ---------------------------------------------------------------------------

describe('getDisplayMedium (via trackingUrl)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns web when navigator.standalone is undefined and display-mode is not standalone', () => {
    setStandalone(undefined);
    setMatchMedia(false);
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_medium')).toBe('web');
  });

  it('returns web when navigator.standalone is false and display-mode is not standalone', () => {
    setStandalone(false);
    setMatchMedia(false);
    const result = trackingUrl('https://example.com');
    expect(new URL(result).searchParams.get('utm_medium')).toBe('web');
  });
});
