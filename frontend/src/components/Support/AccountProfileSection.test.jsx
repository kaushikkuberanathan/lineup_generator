import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountProfileSection } from './AccountProfileSection';

var S = {
  input: {},
  btn: function() { return {}; },
};

function renderSection(overrides) {
  var props = Object.assign({
    updateProfileName: vi.fn().mockResolvedValue({ success: true }),
    initialFirstName: 'Kaushik',
    initialLastName: 'K',
    S: S,
  }, overrides || {});
  return { ...render(<AccountProfileSection {...props} />), props: props };
}

describe('AccountProfileSection', function() {
  it('renders the section label and prefills the name field', function() {
    renderSection();
    expect(screen.getByText('Profile name')).toBeTruthy();
    expect(screen.getByDisplayValue('Kaushik')).toBeTruthy();
    expect(screen.getByDisplayValue('K')).toBeTruthy();
  });

  it('saves through the provided updateProfileName fn', async function() {
    var r = renderSection();
    fireEvent.click(screen.getByText('Save'));
    expect(r.props.updateProfileName).toHaveBeenCalledWith('Kaushik', 'K');
  });
});
