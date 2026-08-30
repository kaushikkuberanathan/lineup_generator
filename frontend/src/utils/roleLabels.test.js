import { describe, test, expect } from 'vitest';
import { ROLE_LABELS, roleLabel } from './roleLabels';

// ============================================================================
// utils/roleLabels.js — 13 lines, longstanding zero-coverage backlog item.
// Display-only, but a wrong or missing label here surfaces directly to
// coaches in the Account tab / team member lists.
// ============================================================================

describe('roleLabels', function () {
  test('ROLE_LABELS covers all four canonical team_memberships roles', function () {
    expect(ROLE_LABELS.admin).toBe('Head Coach');
    expect(ROLE_LABELS.coach).toBe('Coach');
    expect(ROLE_LABELS.scorekeeper).toBe('Scorekeeper');
    expect(ROLE_LABELS.viewer).toBe('Team Member');
  });

  test('roleLabel returns the mapped label for each canonical role', function () {
    Object.keys(ROLE_LABELS).forEach(function (role) {
      expect(roleLabel(role)).toBe(ROLE_LABELS[role]);
    });
  });

  test('roleLabel falls back to "Coach" for an unrecognized or legacy role value', function () {
    expect(roleLabel('team_admin')).toBe('Coach');
    expect(roleLabel('not_a_role')).toBe('Coach');
    expect(roleLabel(undefined)).toBe('Coach');
  });
});
