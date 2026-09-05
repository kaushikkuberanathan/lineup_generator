import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthWorkspace } from './AuthWorkspace';

describe('AuthWorkspace — Wave F reusable composition', function () {
  it('provides one branded, semantic auth frame', function () {
    render(<AuthWorkspace title="Welcome back" subtitle="Sign in to manage your teams"><div>Form content</div></AuthWorkspace>);
    expect(screen.getByRole('img', { name: 'Dugout Lineup' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to manage your teams')).toBeInTheDocument();
    expect(screen.getByText('Form content')).toBeInTheDocument();
  });

  it('supports a semantic status icon without replacing the brand mark', function () {
    render(<AuthWorkspace title="Request submitted" icon="success"><span>Pending review</span></AuthWorkspace>);
    expect(screen.getByRole('img', { name: 'Dugout Lineup' })).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });
});
