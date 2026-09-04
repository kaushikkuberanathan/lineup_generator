/**
 * TeamAction — renders one Home read-model action (Story #1028).
 * Purely presentational: an action's own href is the discovery-only
 * destination per docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md
 * section 26.2 — this component never navigates on its own, it just
 * reports the tap via onSelect(action) so the caller (wired at App.jsx
 * integration time, #1030) can route through the destination resolver,
 * which reauthorizes independently.
 */
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

function getActionIcon(actionId) {
  if (actionId.includes('roster')) return 'roster';
  if (actionId.includes('lineup')) return 'lineup';
  if (actionId.includes('schedule')) return 'calendar';
  if (actionId.includes('game')) return 'gameDay';
  return 'chevronRight';
}

export function TeamAction({ action, onSelect, primary = false }) {
  if (!action) return null;

  var reasonId = action.disabledReason ? `${action.id}-reason` : undefined;

  return (
    <div>
      <Button
        variant={primary ? 'primary' : 'secondaryOutline'}
        leadingIcon={getActionIcon(action.id)}
        typography="contemporary"
        size="sm"
        fullWidth
        disabled={!action.enabled}
        aria-describedby={!action.enabled ? reasonId : undefined}
        onClick={function () {
          if (action.enabled && onSelect) onSelect(action);
        }}
      >
        {action.label}
      </Button>
      {!action.enabled && action.disabledReason && (
        <Text
          as="p"
          id={reasonId}
          size="xs"
          color="secondary"
          style={{ marginTop: tokens.space.xs, marginBottom: 0 }}
        >
          {action.disabledReason}
        </Text>
      )}
    </div>
  );
}
