import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';

export function PageHeader({ title, subtitle, action }) {
  return <Stack direction="row" justify="between" align="center"><span><Text as="h1" variant="pageTitle" style={{ margin: 0 }}>{title}</Text>{subtitle ? <Text as="p" variant="body" color="secondary" style={{ margin: 0 }}>{subtitle}</Text> : null}</span>{action}</Stack>;
}

export function SectionHeader({ title, action }) {
  return <Stack direction="row" justify="between" align="center"><Text as="h2" variant="sectionTitle" uppercase style={{ margin: 0 }}>{title}</Text>{action}</Stack>;
}
