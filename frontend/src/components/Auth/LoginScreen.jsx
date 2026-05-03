import { useState, useEffect } from 'react';
import { track } from '@/utils/analytics';
import { tokens } from "../../theme/tokens";

const TEAM_ID = import.meta.env.VITE_DEFAULT_TEAM_ID || '1774297491626';

export function LoginScreen({ onRequestAccess, sendMagicLink }) {
  const [email, setEmail]         = useState('');
  const [sent, setSent]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Pre-fill email from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter your email address');
    setError('');
    setLoading(true);
    track("login_requested", { method: "magic_link" });

    const result = await sendMagicLink(email.trim().toLowerCase(), TEAM_ID);
    setLoading(false);

    if (!result.success) {
      track("login_failed", { method: "magic_link", error: result.error || "unknown" });
      if (result.error === 'no_membership') {
        setError("We don't have this email on file. Request access below.");
      } else if (result.error?.includes('wait') || result.error?.includes('moment')) {
        setError('Please wait a moment before requesting another link.');
      } else {
        setError(result.error || 'Something went wrong. Try again.');
      }
      return;
    }

    track("login_succeeded", { method: "magic_link" });
    setSent(true);
  }

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoMark}>⚾</div>
            <h1 style={styles.title}>Check your email</h1>
            <p style={styles.subtitle}>Mud Hens · Dugout Lineup</p>
          </div>
          <div style={styles.sentBox}>
            <p style={styles.sentText}>
              We sent a login link to <strong>{email}</strong>.
              Tap the link in that email to sign in.
            </p>
            <p style={styles.sentNote}>
              The link expires in 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>
          <button style={styles.linkBtn} onClick={() => setSent(false)}>
            ← Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoMark}>⚾</div>
          <h1 style={styles.title}>Dugout Lineup</h1>
          <p style={styles.subtitle}>Mud Hens</p>
        </div>
        <form onSubmit={handleSend} style={styles.form}>
          <label style={styles.label}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com"
            style={styles.input}
            autoComplete="email"
            autoFocus
            disabled={loading}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Sending…' : 'Send me a login link'}
          </button>
          <button type="button" style={styles.linkBtn} onClick={onRequestAccess}>
            Don't have access? Request it here
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#f8fafc',
    padding: '24px 16px', boxSizing: 'border-box',
  },
  card: {
    width: '100%', maxWidth: '400px', backgroundColor: '#ffffff',
    borderRadius: '16px', padding: '32px 28px',
    boxShadow: tokens.shadow.card,
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  logoMark: { fontSize: '36px', marginBottom: '8px' },
  title: { margin: 0, fontSize: '22px', fontWeight: '600', color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '14px', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '-4px' },
  input: {
    padding: '12px 14px', fontSize: '16px', border: '1.5px solid #e2e8f0',
    borderRadius: '10px', outline: 'none', width: '100%',
    boxSizing: 'border-box', color: '#0f172a', backgroundColor: '#fff',
  },
  primaryBtn: {
    padding: '13px', fontSize: '16px', fontWeight: '600',
    backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
    borderRadius: '10px', cursor: 'pointer', marginTop: '4px',
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#2563eb',
    fontSize: '14px', cursor: 'pointer', padding: '4px 0', textAlign: 'center',
  },
  sentBox: {
    backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: '10px', padding: '16px', marginBottom: '16px',
  },
  sentText: { margin: '0 0 8px', fontSize: '15px', color: '#166534', lineHeight: '1.6' },
  sentNote: { margin: 0, fontSize: '13px', color: '#16a34a' },
  error: {
    margin: '0', fontSize: '13px', color: '#dc2626',
    padding: '8px 12px', backgroundColor: '#fef2f2',
    borderRadius: '8px', border: '1px solid #fecaca',
  },
};
