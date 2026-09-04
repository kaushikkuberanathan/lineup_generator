import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

export function DefenseWorkspaceHeader({
  lineupLocked = false,
  loading = false,
  availableCount = 0,
  rosterCount = 0,
  absentCount = 0,
  issueCount = 0,
  hasLastAutoGrid = false,
  showDiamond = false,
  gridView = 'player',
  onAutoAssign,
  onCheck,
  onAutoFix,
  onRevert,
  onClear,
  onFinalize,
  onToggleDiamond,
  onGridViewChange,
}) {
  const canGenerate = !loading && availableCount >= 9;
  const assignLabel = loading
    ? 'Loading roster…'
    : absentCount > 0
      ? `Auto-Assign (${absentCount} absent)`
      : 'Auto-Assign';

  return (
    <Card border shadow radius="lg" padding="md" aria-label="Defense lineup controls">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <div>
            <Text as="h2" variant="cardTitle" style={{ margin:0 }}>Defense plan</Text>
            <Text as="p" variant="caption" color="secondary" style={{ margin:0 }}>
              {availableCount}/{rosterCount} players available
            </Text>
          </div>
          <StatusPill status={lineupLocked ? 'success' : issueCount > 0 ? 'attention' : 'ready'}>
            {lineupLocked ? 'Finalized' : issueCount > 0 ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : 'Ready to review'}
          </StatusPill>
        </Stack>

        {!lineupLocked ? (
          <Stack direction="row" gap="sm" wrap>
            <Button typography="contemporary" disabled={!canGenerate} loading={loading} onClick={onAutoAssign}>{assignLabel}</Button>
            <Button typography="contemporary" variant="secondaryOutline" onClick={onCheck}>{issueCount > 0 ? 'Review issues' : 'Check lineup'}</Button>
            {issueCount > 0 ? <Button typography="contemporary" variant="secondary" onClick={onAutoFix}>Auto-Fix All</Button> : null}
            {hasLastAutoGrid ? <Button typography="contemporary" variant="ghost" onClick={onRevert}>Revert</Button> : null}
            <Button typography="contemporary" variant="ghost" onClick={onClear}>Clear</Button>
            <Button typography="contemporary" variant="secondaryOutline" onClick={onFinalize}>Finalize</Button>
          </Stack>
        ) : null}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:tokens.space.sm, flexWrap:'wrap' }}>
          <Button typography="contemporary" variant={showDiamond ? 'secondary' : 'secondaryOutline'} aria-pressed={showDiamond} onClick={onToggleDiamond}>
            {showDiamond ? 'Hide diamond' : 'Show diamond'}
          </Button>
          <SegmentedControl
            label="Defense table view"
            value={gridView}
            onChange={onGridViewChange}
            options={[{ label:'By player', value:'player' }, { label:'By position', value:'position' }]}
          />
        </div>
      </Stack>
    </Card>
  );
}
