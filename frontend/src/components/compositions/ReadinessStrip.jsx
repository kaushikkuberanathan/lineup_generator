import { tokens } from '../../theme/tokens';
import { Icon } from '../ui/Icon';
import { StatusPill } from '../ui/StatusPill';
import { Text } from '../ui/Text';
import { UI_CONTENT } from '../../content/uiContent';

export function ReadinessStrip({ confirmedCount, rosterCount, lineupStatus }) {
  const ready = lineupStatus === 'ready';
  return <div role="status" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.lg, background: ready ? tokens.color.status.successBg : tokens.color.status.warningBg }}><Icon name={ready ? 'success' : 'attention'} size="sm" /><Text variant="caption">Roster {confirmedCount}/{rosterCount} confirmed</Text><StatusPill status={ready ? 'ready' : 'attention'}>{ready ? `Lineup ${UI_CONTENT.status.ready.toLowerCase()}` : `Lineup ${UI_CONTENT.status.draft.toLowerCase()}`}</StatusPill></div>;
}
