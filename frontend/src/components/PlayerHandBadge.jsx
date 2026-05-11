import { Badge } from './ui/Badge';
import { battingHandBadge } from '../utils/playerUtils';
import { tokens } from '../theme/tokens';

export function PlayerHandBadge({ hand, style }) {
  var label = battingHandBadge(hand);
  if (!label) return null;
  return (
    <Badge
      variant={`hand-${label}`}
      style={Object.assign({ verticalAlign: 'middle' }, style)}
    >
      {label}
    </Badge>
  );
}
