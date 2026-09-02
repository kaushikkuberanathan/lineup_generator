/**
 * HomeSkeleton — accessible structural loading placeholder for the very
 * first Home load (no cache to render immediately). Story #1031's "First
 * load uses accessible structural skeletons" criterion.
 *
 * One role="status" announces the loading state once; the placeholder
 * shapes themselves are aria-hidden so a screen reader doesn't read out
 * "blank, blank, blank" for each card.
 */
import { Card } from '../../components/ui/Card';
import { Stack } from '../../components/ui/Stack';
import { tokens } from '../../theme/tokens';

function SkeletonCard() {
  return (
    <Card padding="md" aria-hidden="true">
      <Stack direction="col" gap="sm">
        <div style={{ height: '18px', width: '55%', borderRadius: tokens.radius.sm, background: tokens.color.border.default }} />
        <div style={{ height: '12px', width: '80%', borderRadius: tokens.radius.sm, background: tokens.color.border.default }} />
      </Stack>
    </Card>
  );
}

export function HomeSkeleton() {
  return (
    <Stack direction="col" gap="sm">
      <span role="status" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Loading your teams…
      </span>
      <SkeletonCard />
      <SkeletonCard />
    </Stack>
  );
}
