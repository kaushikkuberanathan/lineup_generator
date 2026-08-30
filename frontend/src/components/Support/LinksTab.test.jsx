import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LinksTab } from './LinksTab';

const EXPECTED_LINKS = [
  ['County Official Game Schedule', 'https://forsythcounty.kaizendemos.app/schedule/2026-youth-baseball-and-softball-mmt6617n', 'county_league', 'schedule_tab'],
  ['Report Game Score', 'https://forms.office.com/pages/responsepage.aspx', 'county_league', 'game_info_card'],
  ['Field & Cage Request', 'https://docs.google.com/forms/d/e/1FAIpQLSeCIvqZlGsxonkWpFJ52q_6PWrOl3mmOTjTdiPGcz3ZQGzJDQ/viewform', 'county_league', 'game_info_card'],
  ['Sharon Springs Athletics', 'https://sharonspringsathletics.org/', 'sharon_springs', 'standings_link'],
  ['Inclement Weather Updates', 'https://parks.forsythco.com/Athletic-Leagues/Inclement-Weather-Information', 'general', 'schedule_tab'],
  ['Status Me Auto Alerts', 'https://statusme.com/', 'general', 'schedule_tab'],
];

describe('LinksTab', () => {
  it('renders every canonical support destination once', () => {
    render(<LinksTab sectionTitleStyle={{}} />);
    expect(screen.getAllByRole('link')).toHaveLength(EXPECTED_LINKS.length);
    EXPECTED_LINKS.forEach(([label]) => expect(screen.getByText(label).closest('a')).toBeTruthy());
  });

  it('preserves destination, campaign tracking, and safe new-tab attributes', () => {
    render(<LinksTab sectionTitleStyle={{}} />);
    EXPECTED_LINKS.forEach(([label, destination, campaign, content]) => {
      const anchor = screen.getByText(label).closest('a');
      const url = new URL(anchor.getAttribute('href'));
      const original = new URL(destination);
      expect(url.origin + url.pathname).toBe(original.origin + original.pathname);
      expect(url.searchParams.get('utm_source')).toBe('dugoutlineup');
      expect(url.searchParams.get('utm_campaign')).toBe(campaign);
      expect(url.searchParams.get('utm_content')).toBe(content);
      expect(anchor.getAttribute('target')).toBe('_blank');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });
});
