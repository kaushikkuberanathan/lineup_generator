import { describe, test, expect } from 'vitest';
import { describeRole } from './roleDescriptions.js';

describe('describeRole', function () {
  test('admin and coach get no caption — no restricted functionality to explain', function () {
    expect(describeRole('admin')).toBeNull();
    expect(describeRole('coach')).toBeNull();
  });

  test('scorekeeper and viewer get a human-readable explanation of their restriction', function () {
    expect(typeof describeRole('scorekeeper')).toBe('string');
    expect(describeRole('scorekeeper').length).toBeGreaterThan(0);
    expect(typeof describeRole('viewer')).toBe('string');
    expect(describeRole('viewer').length).toBeGreaterThan(0);
  });

  test('an unknown role code returns null rather than throwing', function () {
    expect(describeRole('made-up-role')).toBeNull();
  });
});
