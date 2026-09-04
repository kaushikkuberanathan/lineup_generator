const CONTENT = {
  navigation: { home: 'Home', team: 'My Team', schedule: 'Schedule', gameDay: 'Game Day', support: 'Support' },
  home: { viewFocused: 'Focused', viewAllTeams: 'All teams', noUpcomingEvent: 'No upcoming event', findTeam: 'Find your team' },
  action: { view: 'View', manage: 'Manage', edit: 'Edit', add: 'Add', start: 'Start', open: 'Open', share: 'Share' },
  status: { ready: 'Ready', draft: 'In progress', attention: 'Needs attention', offline: 'Offline', home: 'Home', away: 'Away' },
};

export const UI_CONTENT = Object.freeze({
  navigation: Object.freeze(CONTENT.navigation),
  home: Object.freeze(CONTENT.home),
  action: Object.freeze(CONTENT.action),
  status: Object.freeze(CONTENT.status),
});

export function getActionVerb(subject, canEdit) {
  if (!canEdit) return `View ${subject}`;
  if (subject === 'lineup') return 'Edit lineup';
  return `Manage ${subject}`;
}
