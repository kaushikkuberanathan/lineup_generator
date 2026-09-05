import { useAccountScreen } from './useAccountScreen.js';
import { Card } from '../../components/ui/Card';
import { ListRow } from '../../components/ui/ListRow';
import { Stack } from '../../components/ui/Stack';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

export function AccountScreen({ userId, getAccessToken, isOnline, onSelectTeam }) {
  const model = useAccountScreen({ userId, getAccessToken, isOnline });

  if (model.status === 'loading') return <div role="status" style={{ padding: 16 }}>Loading your account…</div>;
  if (model.status === 'offline') return <div role="status" style={{ padding: 16 }}>Your account is unavailable offline until it has loaded once.</div>;
  if (model.status === 'error') return <div role="alert" style={{ padding: 16 }}>We could not load your account. Please try again.</div>;

  const account = model.account;
  if (!account) return null;
  return (
    <div style={{ padding: '14px 16px 24px' }}>
      {model.fromCache ? <Text size="xs" color="tertiary">Showing saved account details</Text> : null}
      <Stack direction="row" justify="between" align="baseline" gap="md" style={{ padding: '0 2px 14px' }}>
        <Text size="xs" color="tertiary" uppercase>Signed in as</Text>
        <Text size="sm" weight="semibold">{account.identity.email}</Text>
      </Stack>
      <Text size="xs" color="tertiary" uppercase style={{ display: 'block', marginBottom: 8 }}>Your teams</Text>
      {(account.memberships || []).length === 0 ? <Text size="sm" color="secondary">Not on any team yet</Text> : (
        <Card padding="0" radius="md" style={{ border: '1px solid ' + tokens.color.border.default, overflow: 'hidden' }}>
          {account.memberships.map(function (membership, index) {
            const team = membership.team;
            return (
              <ListRow key={team.id} showDivider={index < account.memberships.length - 1} onClick={function () { onSelectTeam(team); }} aria-label={'Open ' + team.displayName}>
                <Stack direction="row" justify="between" align="center" gap="md" style={{ flex: 1 }}>
                  <Stack direction="col" gap="xs">
                    <Text size="md" weight="semibold" family="serif" color="navy">{team.displayName}</Text>
                    <Text size="xs" color="tertiary">{[team.ageGroup, team.season, team.year].filter(Boolean).join(' ')}</Text>
                  </Stack>
                  <Text size="xs" weight="bold" color="secondary">{membership.role.label}</Text>
                </Stack>
              </ListRow>
            );
          })}
        </Card>
      )}
    </div>
  );
}
