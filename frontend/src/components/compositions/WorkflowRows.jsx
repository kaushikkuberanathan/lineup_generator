import { CoachWorkflowRow } from './CoachWorkflowRow';

export function EventCard({ title, detail, onOpen, disabled = false }) {
  return <CoachWorkflowRow icon="calendar" title={title} subtitle={detail} onClick={onOpen} disabled={disabled} />;
}

export function PlayerRow({ name, detail, status, onOpen, disabled = false, ariaLabel }) {
  return <CoachWorkflowRow icon="player" title={name} subtitle={detail} status={status} onClick={onOpen} disabled={disabled} ariaLabel={ariaLabel} />;
}

export function HelpRow({ title, summary, onOpen }) {
  return <CoachWorkflowRow icon="support" title={title} subtitle={summary} onClick={onOpen} />;
}
