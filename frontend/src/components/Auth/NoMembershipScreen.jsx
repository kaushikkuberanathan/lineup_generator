/**
 * components/Auth/NoMembershipScreen.jsx
 * Shown when a user has a valid session but belongs to no team.
 *
 * Reached when authState === 'no_membership' — a session exists without a
 * membership. Happens with a Google sign-in (no pre-send membership check
 * like magic link has), or when a membership is revoked between link-send
 * and click. RLS shows this user nothing anyway, so we route them here
 * rather than to an empty app. #394
 *
 * Shows:
 * - The email they signed in as
 * - An explanation that they must be added to a team before editing
 * - "Request access" (primary) → onRequestAccess
 * - "Use a different account" (link) → onSignOut
 */

import { tokens } from "../../theme/tokens";

export function NoMembershipScreen({ email, onRequestAccess, onSignOut }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.icon}>🔑</div>

        <h1 style={styles.title}>You&apos;re signed in, but not on a team</h1>

        <p style={styles.body}>
          You&apos;re signed in
          {email ? <> as <strong>{email}</strong></> : null}, but this account
          isn&apos;t on any team yet. Ask your team admin to add you, or request
          access below.
        </p>

        <button type="button" style={styles.primaryBtn} onClick={onRequestAccess}>
          Request access
        </button>

        <button type="button" style={styles.linkBtn} onClick={onSignOut}>
          Use a different account
        </button>

        <p style={styles.note}>
          Once an admin adds you to a team, sign in again and you&apos;ll have
          full access.
        </p>

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
    color: '#0f172a',
  },
  body: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '0 0 24px',
  },
  primaryBtn: {
    width: '100%',
    padding: '13px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  linkBtn: {
    width: '100%',
    marginTop: '12px',
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'center',
  },
  note: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: '1.5',
  },
};
