import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemStateScreen } from './SystemStateScreen';

describe('SystemStateScreen — Wave F reusable composition', function () {
  it('renders a calm branded loading state', function () {
    render(<SystemStateScreen state="loading" title="Loading Dugout Lineup" message="Getting your teams ready…" />);
    expect(screen.getByRole('heading', { name: 'Loading Dugout Lineup' })).toBeInTheDocument();
    expect(screen.getByText('Getting your teams ready…')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dugout Lineup' })).toBeInTheDocument();
  });

  it('supports dark maintenance framing and a version caption', function () {
    render(<SystemStateScreen state="maintenance" title="We’ll be right back" message="Check back in a few minutes." version="3.4.0" />);
    expect(screen.getByRole('heading', { name: 'We’ll be right back' })).toBeInTheDocument();
    expect(screen.getByText('v3.4.0')).toBeInTheDocument();
  });
});
