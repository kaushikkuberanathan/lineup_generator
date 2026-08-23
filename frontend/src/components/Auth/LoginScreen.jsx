import { useState, useEffect } from 'react';
import { track } from '@/utils/analytics';
import { tokens } from "../../theme/tokens";
import { supabase } from '../../supabase';

const TEAM_ID = import.meta.env.VITE_DEFAULT_TEAM_ID || '1774297491626';

export function LoginScreen({ onRequestAccess, sendMagicLink, authError }) {
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

  // #579: useAuth surfaces authError when a background session-restore
  // (e.g. a failed /me call right after SIGNED_IN) fails — previously this
  // silently stranded the user with no feedback at all. Show it the same
  // way as any other form error rather than adding a second banner.
  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

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

  async function handleGoogleSignIn() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) {
        console.error('[LoginScreen] Google sign-in error:', error.name, error.message);
        setError('Google sign-in failed. Try the email link instead.');
      }
      // on success the browser redirects to Google; nothing else to do here
    } catch (e) {
      console.error('[LoginScreen] Google sign-in threw:', e?.name, e?.message);
      setError('Google sign-in failed. Try the email link instead.');
    }
  }

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoMark}>
              <img src="/pwa-192x192.png" alt="Dugout Lineup" width="56" height="56" />
            </div>
            <h1 style={styles.title}>Check your email</h1>
            <p style={styles.subtitle}>Mud Hens · Dugout Lineup</p>
          </div>
          <div style={styles.sentBox}>
            <p style={styles.sentText}>
              We sent a login link to <strong>{email}</strong>.
              Tap the link in that email to sign in.
            </p>
            <p style={styles.sentNote}>
              The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
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
          <div style={styles.logoMark}>
            <img src="/pwa-192x192.png" alt="Dugout Lineup" width="56" height="56" />
          </div>
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
          <div style={styles.divider} aria-hidden="true">
            <span style={styles.dividerLine}></span>
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine}></span>
          </div>
          <button
            type="button"
            style={styles.googleBtn}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <span style={styles.googleG} aria-hidden="true">G</span>
            Continue with Google
          </button>
          <button type="button" style={styles.linkBtn} onClick={onRequestAccess}>
            Don&apos;t have access? Request it here
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: tokens.color.surface.page,
    padding: '24px 16px', boxSizing: 'border-box',
  },
  card: {
    width: '100%', maxWidth: '400px', backgroundColor: tokens.color.surface.card,
    borderRadius: '16px', padding: '32px 28px',
    boxShadow: tokens.shadow.card,
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  logoMark: { marginBottom: '8px' },
  title: { margin: 0, fontSize: '22px', fontWeight: '600', color: tokens.color.text.primary },
  subtitle: { margin: '4px 0 0', fontSize: '14px', color: tokens.color.text.secondary },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '14px', fontWeight: '500', color: tokens.color.text.body, marginBottom: '-4px' },
  input: {
    padding: '12px 14px', fontSize: '16px', border: `1.5px solid ${tokens.color.border.default}`,
    borderRadius: '10px', outline: 'none', width: '100%',
    boxSizing: 'border-box', color: tokens.color.text.primary, backgroundColor: tokens.color.surface.card,
  },
  primaryBtn: {
    padding: '13px', fontSize: '16px', fontWeight: '600',
    backgroundColor: tokens.color.status.info, color: tokens.color.text.onDark, border: 'none',
    borderRadius: '10px', cursor: 'pointer', marginTop: '4px',
  },
  linkBtn: {
    background: 'none', border: 'none', color: tokens.color.status.info,
    fontSize: '14px', cursor: 'pointer', padding: '4px 0', textAlign: 'center',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0',
  },
  dividerLine: { flex: 1, height: '1px', backgroundColor: tokens.color.border.default },
  dividerText: { fontSize: '12px', color: tokens.color.text.tertiary, fontWeight: '500' },
  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    padding: '13px', fontSize: '15px', fontWeight: '600',
    backgroundColor: tokens.color.surface.card, color: tokens.color.text.body,
    border: `1.5px solid ${tokens.color.border.default}`, borderRadius: '10px', cursor: 'pointer',
  },
  googleG: {
    fontSize: '16px', fontWeight: '700', color: '#4285f4',  // Google's own brand blue - deliberately not tokenized, third-party brand mark
    fontFamily: 'Arial, sans-serif', lineHeight: 1,
  },
  sentBox: {
    backgroundColor: tokens.color.status.successBg, border: `1px solid ${tokens.color.status.successBorder}`,
    borderRadius: '10px', padding: '16px', marginBottom: '16px',
  },
  sentText: { margin: '0 0 8px', fontSize: '15px', color: tokens.color.status.successText, lineHeight: '1.6' },
  sentNote: { margin: 0, fontSize: '13px', color: tokens.color.status.success },
  error: {
    margin: '0', fontSize: '13px', color: tokens.color.status.error,
    padding: '8px 12px', backgroundColor: tokens.color.status.errorBg,
    borderRadius: '8px', border: `1px solid ${tokens.color.status.errorBorder}`,
  },
};
