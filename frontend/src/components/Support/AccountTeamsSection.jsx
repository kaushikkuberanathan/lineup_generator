import { Card } from '../ui/Card';
import { ListRow } from '../ui/ListRow';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { tokens } from '../../theme/tokens';
import { roleLabel } from '../../utils/roleLabels';
import { compareTeamsNewestFirst, formatSeason } from '../../utils/season.js';

/**
 * AccountTeamsSection
 * Support → More landing → "Your teams" row. Extracted from the old
 * renderAccount() (App.jsx) as part of Issue #1099's 3-group regroup —
 * carries the signed-in-as row and per-team membership list verbatim in
 * behavior, migrated off legacy inline styles onto Card/ListRow/Stack/Text.
 *
 * Props:
 *   session      object — Supabase session, for session.user.email
 *   memberships  array  — team_memberships rows
 *   teams        array  — full team list, for name/season lookups
 *   loadTeam     fn     — switches the active team (tap a loaded row)
 */
export function AccountTeamsSection({ session, memberships, teams, loadTeam }) {
  var email = session && session.user && session.user.email ? session.user.email : "—";
  var sortedMemberships = (memberships || []).slice().sort(function(ma, mb) {
    var ta = teams.find(function(t) { return t.id === ma.team_id; });
    var tb = teams.find(function(t) { return t.id === mb.team_id; });
    return compareTeamsNewestFirst(ta, tb);
  });

  var rolePillStyle = {
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
    letterSpacing: tokens.font.letterSpacing.wider,
    textTransform: "uppercase",
    padding: "3px 9px",
    borderRadius: tokens.radius.pill,
    background: tokens.color.brand.navy + "12",
    color: tokens.color.brand.navy,
    border: "1px solid " + tokens.color.brand.navy + "22",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };

  return (
    <div style={{ padding: "14px 16px 24px" }}>
      <Stack
        direction="row"
        justify="between"
        align="baseline"
        gap="md"
        style={{ padding: "0 2px 14px", borderBottom: "1px solid " + tokens.color.border.default, marginBottom: "14px" }}
      >
        <Text size="xs" color="tertiary" uppercase style={{ letterSpacing: tokens.font.letterSpacing.wider, whiteSpace: "nowrap" }}>
          Signed in as
        </Text>
        <Text size="sm" weight="semibold" color="primary" style={{ textAlign: "right", wordBreak: "break-word" }}>
          {email}
        </Text>
      </Stack>

      <Text
        size="xs"
        color="tertiary"
        uppercase
        style={{ display: "block", letterSpacing: tokens.font.letterSpacing.wider, marginBottom: "8px" }}
      >
        Your teams
      </Text>

      {sortedMemberships.length === 0 ? (
        <Text size="sm" color="secondary" style={{ display: "block", fontStyle: "italic", padding: "4px 0 8px" }}>
          Not on any team yet
        </Text>
      ) : (
        <Card padding="0" radius="md" style={{ border: "1px solid " + tokens.color.border.default, overflow: "hidden" }}>
          {sortedMemberships.map(function(m, idx) {
            var team = teams.find(function(t) { return t.id === m.team_id; });
            var role = roleLabel(m.role);
            var isLast = idx === sortedMemberships.length - 1;

            if (!team) {
              return (
                <ListRow key={m.id} disabled showDivider={!isLast}>
                  <Stack direction="row" justify="between" align="center" gap="md" style={{ flex: 1 }}>
                    <Stack direction="col" gap="xs">
                      <Text size="md" weight="semibold" color="secondary">{"Team " + m.team_id}</Text>
                      <Text size="xs" color="tertiary" style={{ fontStyle: "italic" }}>Not loaded</Text>
                    </Stack>
                    <span style={Object.assign({}, rolePillStyle, {
                      background: tokens.color.surface.page,
                      color: tokens.color.text.secondary,
                      border: "1px solid " + tokens.color.border.default,
                    })}>{role}</span>
                  </Stack>
                </ListRow>
              );
            }

            var meta = [team.ageGroup, team.season ? formatSeason(team.season, team.year) : team.year].filter(Boolean).join(" ");
            return (
              <ListRow key={m.id} onClick={function() { loadTeam(team); }} showDivider={!isLast}>
                <Stack direction="row" justify="between" align="center" gap="md" style={{ flex: 1 }}>
                  <Stack direction="col" gap="xs" style={{ minWidth: 0 }}>
                    <Text
                      size="md"
                      weight="semibold"
                      family="serif"
                      color="navy"
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
                    >
                      {team.name}
                    </Text>
                    {meta ? <Text size="xs" color="tertiary">{meta}</Text> : null}
                  </Stack>
                  <Stack direction="row" align="center" gap="sm">
                    <span style={rolePillStyle}>{role}</span>
                    <span aria-hidden="true" style={{ fontSize: tokens.font.size.lg, color: tokens.color.text.tertiary }}>›</span>
                  </Stack>
                </Stack>
              </ListRow>
            );
          })}
        </Card>
      )}
    </div>
  );
}
