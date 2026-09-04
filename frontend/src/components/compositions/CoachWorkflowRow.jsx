import { ActionRow } from '../ui/ActionRow';

export function CoachWorkflowRow({ icon, title, subtitle, status, onClick, disabled, ariaLabel }) {
  return <ActionRow icon={icon} label={title} subtitle={subtitle} trailingContent={status} onClick={onClick} disabled={disabled} aria-label={ariaLabel || (subtitle ? `${title}: ${subtitle}` : title)} />;
}
