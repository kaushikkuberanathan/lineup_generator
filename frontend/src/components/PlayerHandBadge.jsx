import { Badge } from './ui/Badge';
import { battingHandBadge } from '../utils/playerUtils';

export function PlayerHandBadge({ hand, context = 'light', style }) {
  var label = battingHandBadge(hand);
  if (!label) return null;
  return (
    <Badge
      variant={`hand-${label}`}
      context={context}
      style={Object.assign({ verticalAlign: 'middle' }, style)}
    >
      {label}
    </Badge>
  );
}
