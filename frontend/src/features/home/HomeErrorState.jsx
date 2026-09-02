/**
 * HomeErrorState — shown when the very first Home load fails with no
 * cache to fall back on (Story #1031). A real server-error message with
 * a retry, not a silent blank screen.
 */
import { Stack } from '../../components/ui/Stack';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';

export function HomeErrorState({ onRetry }) {
  return (
    <Stack direction="col" gap="sm" role="alert">
      <Text as="p" size="sm" color="body">
        We couldn&apos;t load your teams. Please check your connection and try again.
      </Text>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Stack>
  );
}
