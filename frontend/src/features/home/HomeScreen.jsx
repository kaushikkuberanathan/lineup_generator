/**
 * HomeScreen — the redesigned Home feature shell (Story #1028). Extracted
 * as far as approved integration boundaries allow: this component and
 * everything it renders is brand new, standalone, and not yet mounted
 * anywhere in App.jsx — that wiring is a separate story (#1030) requiring
 * the literal "all clear — App.jsx editing approved" gate phrase.
 *
 * The loading/error/empty branches below are deliberately minimal
 * placeholders, not the polished states — #1031 ("Loading, cache,
 * offline, slow-backend, empty, and access-loss states") owns those.
 * This story's acceptance criteria are about the Team Hub itself.
 */
import { useHomeScreen } from './useHomeScreen.js';
import { TeamHub } from './TeamHub.jsx';

export function HomeScreen({ userId, getAccessToken, fetchImpl, cacheStorage, onSelectAction }) {
  const homeScreen = useHomeScreen({ userId, getAccessToken, fetchImpl, cacheStorage });

  if (homeScreen.status === 'loading') {
    return <p role="status">Loading your teams…</p>;
  }

  if (homeScreen.status === 'error' && !homeScreen.home) {
    return <p role="alert">We couldn&apos;t load your teams. Please try again.</p>;
  }

  const teams = (homeScreen.home && homeScreen.home.teams) || [];
  if (teams.length === 0) {
    return <p>No teams yet.</p>;
  }

  return (
    <TeamHub
      teams={teams}
      expandedTeamId={homeScreen.expandedTeamId}
      viewFilter={homeScreen.viewFilter}
      onExpand={homeScreen.expandTeam}
      onViewFilterChange={homeScreen.setViewFilter}
      onSelectAction={onSelectAction}
    />
  );
}
