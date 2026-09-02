/**
 * HomeScreen — the redesigned Home feature shell (Story #1028, extended
 * in #1031 for loading/cached/offline/slow-backend/empty/access-loss/
 * cache-version states). Not yet mounted anywhere in App.jsx — that
 * wiring is #1030, requiring the literal "all clear — App.jsx editing
 * approved" gate phrase.
 */
import { useHomeScreen } from './useHomeScreen.js';
import { TeamHub } from './TeamHub.jsx';
import { HomeSkeleton } from './HomeSkeleton.jsx';
import { HomeErrorState } from './HomeErrorState.jsx';
import { applyOfflineActionGating } from './offlineActionGating.js';
import { trackHomeActionSelected } from './homeAnalytics.js';
import { parseAppRoute } from '../../api/routes.js';
import { Stack } from '../../components/ui/Stack';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { OfflineIndicator } from '../../components/Shared/OfflineIndicator';

/**
 * @param {object} props
 * @param {string|null} props.userId
 * @param {() => Promise<string|null>} props.getAccessToken
 * @param {boolean} [props.isOnline] - parent-provided navigator.onLine state
 * @param {() => void} [props.onFindTeam] - Story #1031: "No-membership state
 *   routes to the existing discovery/request-access journey" — this
 *   component doesn't own that journey (TeamSearch/RequestAccessScreen
 *   live outside frontend/src/features/home), so it's a callback the
 *   #1030 integration wires to the real navigation.
 * @param {string} [props.initialExpandedTeamId] - Story #1030: restores
 *   the expected expanded team when Back returns to Home after a
 *   compatibility-adapter navigation
 * @param {typeof fetch} [props.fetchImpl] - test seam
 * @param {(ms:number) => Promise<void>} [props.waitImpl] - test seam
 * @param {object} [props.cacheStorage] - test seam
 * @param {Function} [props.onSelectAction]
 */
export function HomeScreen({ userId, getAccessToken, isOnline = true, onFindTeam, initialExpandedTeamId, fetchImpl, waitImpl, cacheStorage, onSelectAction }) {
  const homeScreen = useHomeScreen({ userId, getAccessToken, isOnline, initialExpandedTeamId, fetchImpl, waitImpl, cacheStorage });

  if (homeScreen.status === 'loading') {
    return <HomeSkeleton />;
  }

  if (homeScreen.status === 'offline') {
    return (
      <Stack direction="col" gap="sm">
        <OfflineIndicator isOnline={false} hasCache={false} />
        <Text as="p" size="sm" color="body">
          You&apos;re offline and we don&apos;t have any saved team data on this device yet.
          Reconnect to load your teams.
        </Text>
      </Stack>
    );
  }

  if (homeScreen.status === 'error' && !homeScreen.home) {
    return <HomeErrorState onRetry={homeScreen.refetch} />;
  }

  const teams = (homeScreen.home && homeScreen.home.teams) || [];

  if (teams.length === 0) {
    return (
      <Stack direction="col" gap="sm">
        <Text as="p" size="sm" color="body">
          You&apos;re not on any team yet.
        </Text>
        {onFindTeam && (
          <Button variant="secondary" size="sm" onClick={onFindTeam}>
            Find your team
          </Button>
        )}
      </Stack>
    );
  }

  const gatedTeams = applyOfflineActionGating(teams, isOnline);

  function handleSelectAction(action) {
    const route = parseAppRoute(action.href);
    const team = route && route.teamId ? teams.find(function (t) { return t.id === route.teamId; }) : null;
    trackHomeActionSelected({
      teamId: route ? route.teamId : null,
      actionId: action.id,
      role: team && team.role && team.role.code,
    });
    if (onSelectAction) onSelectAction(action);
  }

  return (
    <Stack direction="col" gap="sm">
      <OfflineIndicator isOnline={isOnline} hasCache={homeScreen.fromCache || !!homeScreen.home} />

      {homeScreen.justLostAccessTeamId && (
        <Stack direction="row" justify="between" align="center" role="status">
          <Text size="xs" color="secondary">
            You no longer have access to a team you were viewing. Showing your current teams instead.
          </Text>
          <Button variant="ghost" size="sm" onClick={homeScreen.dismissAccessLostNotice}>
            Dismiss
          </Button>
        </Stack>
      )}

      <TeamHub
        teams={gatedTeams}
        expandedTeamId={homeScreen.expandedTeamId}
        viewFilter={homeScreen.viewFilter}
        onExpand={homeScreen.expandTeam}
        onViewFilterChange={homeScreen.setViewFilter}
        onSelectAction={handleSelectAction}
      />
    </Stack>
  );
}
