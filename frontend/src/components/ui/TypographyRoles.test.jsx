import React from 'react';
import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { Text } from './Text';
import { tokens } from '../../theme/tokens';

describe('Text semantic typography roles', function () {
  test.each([
    'display',
    'pageTitle',
    'sectionTitle',
    'cardTitle',
    'body',
    'label',
    'caption',
    'button',
  ])('renders the %s role from the shared token contract', function (role) {
    var { container } = render(<Text variant={role}>Example</Text>);
    var element = container.firstChild;
    var expected = tokens.font.role[role];

    if (expected.fontFamily.includes('Georgia')) {
      expect(element.style.fontFamily).toContain('Georgia');
    } else {
      expect(element.style.fontFamily).toContain('Segoe UI');
    }
    expect(element.style.fontSize).toBe(expected.fontSize);
    expect(element.style.fontWeight).toBe(String(expected.fontWeight));
    expect(element.style.lineHeight).toBe(String(expected.lineHeight));
    expect(element.style.letterSpacing).toBe(expected.letterSpacing === '0' ? '0px' : expected.letterSpacing);
  });

  test('explicit props and style remain compatible overrides', function () {
    var { container } = render(
      <Text variant="body" size="lg" weight="bold" family="serif" style={{ letterSpacing: '0.2em' }}>
        Override
      </Text>,
    );
    var element = container.firstChild;

    expect(element.style.fontSize).toBe(tokens.font.size.lg);
    expect(element.style.fontWeight).toBe(String(tokens.font.weight.bold));
    expect(element.style.fontFamily).toContain('Georgia');
    expect(element.style.letterSpacing).toBe('0.2em');
  });
});
