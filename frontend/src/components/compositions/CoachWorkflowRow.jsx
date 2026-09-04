import { ActionRow } from '../ui/ActionRow';

export function CoachWorkflowRow({ icon, title, subtitle, onClick, disabled }) {
  return <ActionRow icon={icon} label={title} subtitle={subtitle} onClick={onClick} disabled={disabled} aria-label={subtitle ? `${title}: ${subtitle}` : title} />;
}
