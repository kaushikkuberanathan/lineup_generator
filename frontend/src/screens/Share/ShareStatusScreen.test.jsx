import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareStatusScreen } from './ShareStatusScreen';

describe('ShareStatusScreen', function () {
  it('renders the branded loading state without an authentication gate', function () {
    render(<ShareStatusScreen state="loading" message="Loading lineup…" />);
    expect(screen.getByRole('heading', { name: 'Opening lineup' })).toBeInTheDocument();
    expect(screen.getByText('Loading lineup…')).toBeInTheDocument();
    expect(screen.getByText(/No sign-in required/)).toBeInTheDocument();
  });

  it('renders the supplied failure detail', function () {
    render(<ShareStatusScreen state="error" message="This share link could not be found." />);
    expect(screen.getByRole('heading', { name: 'Lineup unavailable' })).toBeInTheDocument();
    expect(screen.getByText('This share link could not be found.')).toBeInTheDocument();
  });
});
