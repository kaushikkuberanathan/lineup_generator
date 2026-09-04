import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MoreLanding } from './MoreLanding';
import { HELP_ARTICLES, HELP_CATEGORY_META } from '../../content/faqs';

var TEAMS = [
  { id: 't1', name: 'Mud Hens', ageGroup: '10U', season: 'Fall', year: 2026 },
  { id: 't2', name: 'Bananas', ageGroup: '8U', season: 'Spring', year: 2026 },
];

function renderLanding(overrides) {
  var props = Object.assign({
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    memberships: [{ id: 'm1', team_id: 't1', role: 'admin' }],
    teams: TEAMS,
    user: { profile: { first_name: 'Kaushik', last_name: 'K' } },
    appVersion: '3.3.3',
  }, overrides || {});
  return { ...render(<MoreLanding {...props} />), props: props };
}

describe('MoreLanding', function() {
  it('renders all 3 group labels and every row', function() {
    renderLanding();
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Get Help')).toBeTruthy();
    expect(screen.getByText('About & Legal')).toBeTruthy();

    expect(screen.getByText('Your teams')).toBeTruthy();
    expect(screen.getByText('Profile name')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(screen.getByText('Help — Search & FAQs')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText("What's New")).toBeTruthy();
    expect(screen.getByText('Terms & Privacy')).toBeTruthy();
    expect(screen.getByText('Links')).toBeTruthy();
    expect(screen.getByText('Feedback')).toBeTruthy();
  });

  it('navigates on each non-Account-group row tap with the matching key', function() {
    var r = renderLanding();
    fireEvent.click(screen.getByText('Help — Search & FAQs'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('faq');
    fireEvent.click(screen.getByText('About'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('about');
    fireEvent.click(screen.getByText("What's New"));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('updates');
    fireEvent.click(screen.getByText('Terms & Privacy'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('legal');
    fireEvent.click(screen.getByText('Links'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('links');
    fireEvent.click(screen.getByText('Feedback'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('feedback');
  });

  it('routes Your teams and Profile name to their own destinations', function() {
    var r = renderLanding();
    fireEvent.click(screen.getByText('Your teams'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('account-teams');
    fireEvent.click(screen.getByText('Profile name'));
    expect(r.props.onNavigate).toHaveBeenLastCalledWith('account-profile');
  });

  it('fires onSignOut directly on tap — no navigation, no confirm step', function() {
    var r = renderLanding();
    fireEvent.click(screen.getByText('Sign out'));
    expect(r.props.onSignOut).toHaveBeenCalledTimes(1);
    expect(r.props.onNavigate).not.toHaveBeenCalled();
  });

  it('derives the Your teams subtitle from the newest membership', function() {
    renderLanding({ memberships: [
      { id: 'm1', team_id: 't2', role: 'coach' },
      { id: 'm2', team_id: 't1', role: 'admin' },
    ] });
    // Fall 2026 (t1) sorts newer than Spring 2026 (t2) — compareTeamsNewestFirst
    expect(screen.getByText('Mud Hens +1 more')).toBeTruthy();
  });

  it('shows a no-teams subtitle when memberships is empty', function() {
    renderLanding({ memberships: [] });
    expect(screen.getByText('Not on any team yet')).toBeTruthy();
  });

  it('prompts to add a name when the profile has none set', function() {
    renderLanding({ user: { profile: { first_name: '', last_name: '' } } });
    expect(screen.getByText('Add your name')).toBeTruthy();
  });

  it('shows the real help article/category counts, not a hardcoded number', function() {
    renderLanding();
    var expected = HELP_ARTICLES.length + ' articles · ' + HELP_CATEGORY_META.length + ' topics';
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('shows the app version badge on What’s New', function() {
    renderLanding({ appVersion: '9.9.9' });
    expect(screen.getByText('v9.9.9')).toBeTruthy();
  });

  it('adds semantic icon tiles only when the contemporary flags are enabled', function() {
    var legacy = renderLanding();
    expect(legacy.container.querySelectorAll('svg')).toHaveLength(0);
    legacy.unmount();

    var contemporary = renderLanding({ supportEnabled: true, accountEnabled: true });
    expect(screen.getByRole('heading', { name: 'Your dugout' })).toBeInTheDocument();
    expect(contemporary.container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(8);
  });
});
