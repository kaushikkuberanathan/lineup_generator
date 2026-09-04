import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SupportWorkspace } from './SupportWorkspace';

describe('SupportWorkspace', function() {
  it('frames a Support destination without replacing its content', function() {
    render(<SupportWorkspace title="Help center" subtitle="Answers at the field." icon="support"><p>Offline answer</p></SupportWorkspace>);
    expect(screen.getByRole('heading', { name: 'Help center' })).toBeInTheDocument();
    expect(screen.getByText('Answers at the field.')).toBeInTheDocument();
    expect(screen.getByText('Offline answer')).toBeInTheDocument();
  });

  it('supports the independently reversible Account tone', function() {
    render(<SupportWorkspace title="Your teams" subtitle="Season access" icon="team" tone="account"><p>Mud Hens</p></SupportWorkspace>);
    expect(screen.getByRole('heading', { name: 'Your teams' })).toBeInTheDocument();
    expect(screen.getByText('Mud Hens')).toBeInTheDocument();
  });
});
