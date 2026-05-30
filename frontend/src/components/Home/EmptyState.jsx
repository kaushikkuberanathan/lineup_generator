/**
 * EmptyState
 * Extracted from App.jsx v1.6.9
 * Shown inside the team list when search returns no results or no teams exist.
 *
 * Phase 3 Step 2 (v2.5.11): structural JSX migrated to consume Phase 2 primitives.
 *   Outer container:  Stack (replaces raw display:flex div)
 *   Subtitle:         Text size="sm" color="disabled"
 *   Button:           Button variant="secondary" size="sm"
 *   Title:            Text size="mdLg" color="body" (tokens added in Story 60)
 *
 * Props:
 *   hasQuery      {boolean}   true if a search string is active
 *   onCreateTeam  {function}  callback to open the create-team form
 */
import { Text } from '../ui/Text';
import { Stack } from '../ui/Stack';
import { Button } from '../ui/Button';

export function EmptyState({ hasQuery, onCreateTeam }) {
  return (
    <Stack direction="col" align="center" gap="sm" style={{ textAlign:"center", padding:"36px 16px" }}>
      <div style={{ fontSize:"32px", lineHeight:1 }}>{hasQuery ? "🔍" : "🏟️"}</div>
      <Text family="serif" weight="bold" size="mdLg" color="body" style={{ marginTop:"4px" }}>
        {hasQuery ? "No teams found" : "No teams yet"}
      </Text>
      <Text size="sm" color="disabled">
        {hasQuery ? "Try a different search, or create a new team." : "Create your first team to get started."}
      </Text>
      <Button variant="secondary" size="sm" onClick={onCreateTeam} style={{ marginTop:"8px" }}>
        + Create Team
      </Button>
    </Stack>
  );
}
