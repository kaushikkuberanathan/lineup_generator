import { describe, expect, test } from 'vitest';
import { UI_CONTENT, getActionVerb } from './uiContent';

describe('UI content contract', function () {
  test('exposes stable Home and status vocabulary', function () {
    expect(UI_CONTENT.home.viewFocused).toBe('Focused');
    expect(UI_CONTENT.status.ready).toBe('Ready');
    expect(Object.isFrozen(UI_CONTENT)).toBe(true);
  });

  test('uses permission-aware verbs', function () {
    expect(getActionVerb('roster', false)).toBe('View roster');
    expect(getActionVerb('roster', true)).toBe('Manage roster');
    expect(getActionVerb('lineup', true)).toBe('Edit lineup');
  });
});
