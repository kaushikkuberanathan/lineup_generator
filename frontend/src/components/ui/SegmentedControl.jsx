import { tokens } from '../../theme/tokens';
import { Text } from './Text';

export function SegmentedControl({ value, options, onChange, label = 'View options' }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', padding: tokens.space.xs, gap: tokens.space.xs, borderRadius: tokens.radius.pill, background: tokens.color.surface.page }}>
      {options.map(function (option) {
        const active = option.value === value;
        return (
          <button key={option.value} type="button" aria-pressed={active} onClick={function () { if (onChange) onChange(option.value); }} style={{
            minHeight: '44px', padding: `0 ${tokens.space.md}`, border: 'none', borderRadius: tokens.radius.pill,
            background: active ? tokens.color.brand.navy : 'transparent', color: active ? tokens.color.text.onDark : tokens.color.text.secondary,
            cursor: 'pointer',
          }}>
            <Text variant="label" color="inherit">{option.label}</Text>
          </button>
        );
      })}
    </div>
  );
}
