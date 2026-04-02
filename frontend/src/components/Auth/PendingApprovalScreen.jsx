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

export function PendingApprovalScreen({ onTryLogin }) {
  const pendingEmail = localStorage.getItem('lg_pending_email') || '';

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.icon}>⏳</div>

        <h1 style={styles.title}>Request submitted</h1>

        <p style={styles.body}>
          Your access request has been sent to the head coach for review.
          {pendingEmail && (
            <> You'll receive an email at <strong>{pendingEmail}</strong> once approved.</>
          )}
        </p>

        <div style={styles.steps}>
          <div style={styles.step}>
            <span style={styles.stepIcon}>✓</span>
            <span>Request submitted</span>
          </div>
          <div style={{ ...styles.step, color: '#94a3b8' }}>
            <span style={{ ...styles.stepIcon, backgroundColor: '#f1f5f9', color: '#94a3b8' }}>2</span>
            <span>Coach reviews and approves</span>
          </div>
          <div style={{ ...styles.step, color: '#94a3b8' }}>
            <span style={{ ...styles.stepIcon, backgroundColor: '#f1f5f9', color: '#94a3b8' }}>3</span>
            <span>You receive an approval email</span>
          </div>
          <div style={{ ...styles.step, color: '#94a3b8' }}>
            <span style={{ ...styles.stepIcon, backgroundColor: '#f1f5f9', color: '#94a3b8' }}>4</span>
            <span>Tap the link and log in</span>
          </div>
        </div>

        <p style={styles.note}>
          This usually takes a few hours. If you think you've already been
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
    backgroundColor: '#f8fafc',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '36px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
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
    color: '#0f172a',
  },
  body: {
    fontSize: '15px',
    color: '#475569',
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
    color: '#0f172a',
  },
  stepIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  note: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  btn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '500',
    backgroundColor: '#f8fafc',
    color: '#2563eb',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
  },
};
