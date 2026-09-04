import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';
import { Text } from '../../components/ui/Text';

export function BattingWorkspaceHeader({
  lineupLocked = false,
  dirty = false,
  saved = false,
  orderCount = 0,
  activeCount = 0,
  canUndo = false,
  onSave,
  onSuggest,
  onUndo,
  onFinalize,
}) {
  const status = lineupLocked ? 'Finalized' : saved ? 'Saved' : dirty ? 'Unsaved changes' : orderCount > 0 ? 'Ready to review' : 'Order needed';
  const tone = lineupLocked || saved || (!dirty && orderCount > 0) ? 'success' : 'attention';

  return (
    <Card border shadow radius="lg" padding="md" aria-label="Batting order controls">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <div>
            <Text as="h2" variant="cardTitle" style={{ margin:0 }}>Batting order</Text>
            <Text as="p" variant="caption" color="secondary" style={{ margin:0 }}>
              {activeCount}/{orderCount} available tonight
            </Text>
          </div>
          <StatusPill status={tone}>{status}</StatusPill>
        </Stack>

        {!lineupLocked ? (
          <Stack direction="row" gap="sm" wrap>
            {dirty ? <Button typography="contemporary" onClick={onSave}>Save Order</Button> : null}
            <Button typography="contemporary" variant={dirty ? 'secondaryOutline' : 'primary'} disabled={orderCount === 0} onClick={onSuggest}>Suggest Order</Button>
            {canUndo ? <Button typography="contemporary" variant="ghost" onClick={onUndo}>Undo</Button> : null}
            <Button typography="contemporary" variant="secondaryOutline" disabled={dirty || orderCount === 0} onClick={onFinalize}>Finalize</Button>
          </Stack>
        ) : null}

        {dirty ? <Text variant="caption" color="secondary">Save the order before finalizing.</Text> : null}
      </Stack>
    </Card>
  );
}
