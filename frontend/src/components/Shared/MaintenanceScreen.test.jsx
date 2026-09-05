import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaintenanceScreen } from './MaintenanceScreen';

// ============================================================================
// MaintenanceScreen smoke tests (MS1-MS5) - Track A3 / #423
//
// MaintenanceScreen is a token-driven, stateless full-screen fallback shown
// when MAINTENANCE_MODE is enabled (see featureFlags.js). Single optional
// prop: `version`. Mirrors AboutTab.test.jsx's smoke-test pattern.
// ============================================================================

describe('MaintenanceScreen - smoke', function () {

  test('MS1: renders without crashing (no version)', function () {
    var result = render(<MaintenanceScreen />);
    expect(result.container.firstChild).toBeTruthy();
  });

  test('MS2: headline "We\u2019ll be right back" visible', function () {
    render(<MaintenanceScreen />);
    expect(screen.getByText('We\u2019ll be right back')).toBeTruthy();
  });

  test('MS3: description text visible', function () {
    render(<MaintenanceScreen />);
    expect(screen.getByText(/Lineup Generator is getting an update/i)).toBeTruthy();
  });

  test('MS4: version renders when prop is passed', function () {
    render(<MaintenanceScreen version="2.8.1" />);
    expect(screen.getByText('v2.8.1')).toBeTruthy();
  });

  test('MS5: version section absent when prop is omitted', function () {
    render(<MaintenanceScreen />);
    expect(screen.queryByText(/^v\d/)).toBeNull();
  });

});

describe('MaintenanceScreen - Wave F contemporary treatment', function () {
  test('uses the shared system-state composition when enabled', function () {
    render(<MaintenanceScreen version="3.4.0" contemporary />);
    expect(document.querySelector('[data-system-state="maintenance"]')).toBeTruthy();
    expect(screen.getByText('v3.4.0')).toBeInTheDocument();
  });
});
