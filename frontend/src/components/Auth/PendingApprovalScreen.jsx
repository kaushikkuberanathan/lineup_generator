/**
 * components/Auth/PendingApprovalScreen.jsx
 * Shown after a user submits an access request.
 * Stays on screen until admin approves and user logs in.
 *
 * Shows:
 * - Confirmation that request was received
 * - What happens next
 * - "Try logging in" link (in case they've already been approved
 *   and arrive here again on a new visit)
 */

import { tokens } from "../../theme/tokens";
import { AuthWorkspace } from './AuthWorkspace';
import { Button } from '../ui/Button';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';

export function PendingApprovalScreen({ onTryLogin, contemporary = false }) {
  const pendingEmail = localStorage.getItem('lg_pending_email') || '';

  if (contemporary) {
    return (
      <AuthWorkspace title="Request submitted" subtitle="Your request is pending review" icon="success">
        <Stack direction="col" gap="md">
          <Text as="p" variant="body" color="secondary" style={{ margin: 0, textAlign: 'center', lineHeight: tokens.font.lineHeight.relaxed }}>
            Your access request has been sent for review.
            {pendingEmail ? <> You&apos;ll receive an email at <strong>{pendingEmail}</strong> once approved.</> : null}
          </Text>
          <Stack direction="col" gap="sm" style={{ padding: tokens.space.md, background: tokens.color.surface.page, borderRadius: tokens.radius.lg }}>
            <Text size="body" weight="semibold">✓ Request submitted</Text>
            <Text size="body" color="secondary">2 · Admin reviews and approves</Text>
            <Text size="body" color="secondary">3 · You receive an approval email</Text>
            <Text size="body" color="secondary">4 · Tap the link and log in</Text>
          </Stack>
          <Text size="sm" color="tertiary" style={{ textAlign: 'center' }}>This usually takes a few hours.</Text>
          <Button typography="contemporary" variant="secondaryOutline" fullWidth onClick={onTryLogin}>Try logging in</Button>
        </Stack>
      </AuthWorkspace>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.icon}>⏳</div>

        <h1 style={styles.title}>Request submitted</h1>

        <p style={styles.body}>
          Your access request has been sent to Dugout Lineup&apos;s admin team for review.
          {pendingEmail && (
            <> You&apos;ll receive an email at <strong>{pendingEmail}</strong> once approved.</>
          )}
        </p>

        <div style={styles.steps}>
          <div style={styles.step}>
            <span style={styles.stepIcon}>✓</span>
            <span>Request submitted</span>
          </div>
          <div style={{ ...styles.step, color: tokens.color.text.tertiary }}>
            <span style={{ ...styles.stepIcon, backgroundColor: '#f1f5f9', color: tokens.color.text.tertiary }}>2</span>
            <span>Admin reviews and approves</span>
          </div>
          <div style={{ ...styles.step, color: tokens.color.text.tertiary }}>
            <span style={{ ...styles.stepIcon, backgroundColor: '#f1f5f9', color: tokens.color.text.tertiary }}>3</span>
            <span>You receive an approval email</span>
          </div>
          <div style={{ ...styles.step, color: tokens.color.text.tertiary }}>
            <span style={{ ...styles.stepIcon, backgroundColor: '#f1f5f9', color: tokens.color.text.tertiary }}>4</span>
            <span>Tap the link and log in</span>
          </div>
        </div>

        <p style={styles.note}>
          This usually takes a few hours. If you think you&apos;ve already been
          approved, try logging in below.
        </p>

        <button style={styles.btn} onClick={onTryLogin}>
          Try logging in
        </button>

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.surface.page,
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: tokens.color.surface.card,
    borderRadius: '16px',
    padding: '36px 28px',
    boxShadow: tokens.shadow.card,
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 12px',
    fontSize: '22px',
    fontWeight: '600',
    color: tokens.color.text.primary,
  },
  body: {
    fontSize: '15px',
    color: tokens.color.text.secondary,
    lineHeight: '1.6',
    margin: '0 0 24px',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
    marginBottom: '24px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: tokens.color.text.primary,
  },
  stepIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.color.status.successBg,
    color: tokens.color.status.success,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  note: {
    fontSize: '12px',
    color: tokens.color.text.tertiary,
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  btn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '500',
    backgroundColor: tokens.color.surface.page,
    color: tokens.color.status.info,
    border: `1.5px solid ${tokens.color.border.default}`,
    borderRadius: '10px',
    cursor: 'pointer',
  },
};
