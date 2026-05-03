/**
 * components/Auth/RequestAccessScreen.jsx
 * Access request form for coaches and coordinators.
 * Pre-fills team and role from URL params.
 *
 * URL params:
 *   ?team=1774297491626  — pre-fills team ID
 *   ?role=coach          — pre-fills role
 *
 * On submit: POST /auth/request-access → PendingApprovalScreen
 */

import { useState, useEffect } from 'react';
import { track } from '@/utils/analytics';
import { tokens } from "../../theme/tokens";

const TEAM_ID = import.meta.env.VITE_DEFAULT_TEAM_ID || '1774297491626';

const ROLE_OPTIONS = [
  { value: 'team_admin',  label: 'Head Coach' },
  { value: 'coach',       label: 'Assistant Coach' },
  { value: 'coordinator', label: 'Team Coordinator' },
];

export function RequestAccessScreen({ onBack, requestAccess }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState('coach');
  const [teamId, setTeamId]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Pre-fill from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam && ROLE_OPTIONS.find(r => r.value === roleParam)) {
      setRole(roleParam);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!firstName.trim()) return setError('First name is required');
    if (!lastName.trim())  return setError('Last name is required');
    if (!email.trim())     return setError('Email address is required');
    if (!email.includes('@')) return setError('Enter a valid email address');
    if (!teamId.trim() && !TEAM_ID) return setError('Team ID is required');

    setError('');
    setLoading(true);

    const result = await requestAccess({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim().toLowerCase(),
      role,
      tid:       teamId.trim() || TEAM_ID,
    });

    setLoading(false);

    if (!result.success) {
      if (result.error === 'already_approved') {
        setError('This email already has access. Try logging in instead.');
      } else {
        setError(result.error || 'Something went wrong. Try again.');
      }
    } else {
      track("access_requested", { team_id: teamId.trim() || TEAM_ID });
    }
    // On success, useAuth sets authState → 'pending_approval'
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.header}>
          <div style={styles.logoMark}>⚾</div>
          <h1 style={styles.title}>Request Access</h1>
          <p style={styles.subtitle}>Mud Hens · Dugout Lineup</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>First name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(''); }}
                placeholder="Jane"
                style={styles.input}
                autoComplete="given-name"
                disabled={loading}
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => { setLastName(e.target.value); setError(''); }}
                placeholder="Smith"
                style={styles.input}
                autoComplete="family-name"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              style={styles.input}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label style={styles.label}>Team ID <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional — leave blank for Mud Hens)</span></label>
            <input
              type="text"
              value={teamId}
              onChange={e => { setTeamId(e.target.value); setError(''); }}
              placeholder={TEAM_ID}
              style={styles.input}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div>
            <label style={styles.label}>Your role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Submitting…' : 'Request access'}
          </button>

          <button type="button" style={styles.linkBtn} onClick={onBack}>
            ← Back to login
          </button>

        </form>

        <p style={styles.note}>
          The head coach will review your request and you'll receive an email
          when approved — usually within a few hours.
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
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px 28px',
    boxShadow: tokens.shadow.card,
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoMark: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  col: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
    display: 'block',
  },
  input: {
    padding: '11px 13px',
    fontSize: '16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  select: {
    padding: '11px 13px',
    fontSize: '15px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: '#0f172a',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '13px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'center',
  },
  error: {
    margin: '0',
    fontSize: '13px',
    color: '#dc2626',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  note: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: '1.5',
  },
};
