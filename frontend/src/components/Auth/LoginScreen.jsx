/**
 * components/Auth/LoginScreen.jsx
 * Two-step login: email entry → OTP code entry.
 * Mobile-first — designed for coaches opening the app on a phone.
 *
 * Step 1: Enter email → POST /auth/login → OTP sent
 * Step 2: Enter 6-8 digit code → POST /auth/verify → session stored
 *
 * Pre-fills email from ?email= URL param (set by approval email link).
 * Shows "Request Access" link for users who don't have an account.
 */

import { useState, useEffect, useRef } from 'react';

const TEAM_ID = import.meta.env.VITE_DEFAULT_TEAM_ID || '1774297491626';

export function LoginScreen({ onRequestAccess, requestOtp, verifyOtp }) {
  const [step, setStep]       = useState('email'); // 'email' | 'code'
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const codeRef = useRef(null);
  const timerRef = useRef(null);

  // Pre-fill email from URL param (set by approval email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, []);

  // Focus code input when step changes
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeRef.current?.focus(), 100);
    }
  }, [step]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  // ─── Step 1: Send OTP ────────────────────────────────────────────────────────

  async function handleSendCode(e) {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter your email address');
    setError('');
    setLoading(true);

    const result = await requestOtp(email.trim().toLowerCase(), TEAM_ID);
    setLoading(false);

    if (!result.success) {
      if (result.error === 'no_membership') {
        setError("We don't have this email on file. Request access below.");
      } else {
        setError(result.error || 'Something went wrong. Try again.');
      }
      return;
    }

    setStep('code');
    setResendTimer(60);
  }

  // ─── Step 2: Verify OTP ──────────────────────────────────────────────────────

  async function handleVerify(e) {
    e.preventDefault();
    if (code.trim().length < 6) return setError('Enter the full code from your email');
    setError('');
    setLoading(true);

    const result = await verifyOtp(email.trim().toLowerCase(), code.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid code. Try again or request a new one.');
      setCode('');
    }
    // On success, useAuth sets authState → 'authenticated' and app re-renders
  }

  // ─── Resend OTP ──────────────────────────────────────────────────────────────

  async function handleResend() {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    const result = await requestOtp(email.trim().toLowerCase(), TEAM_ID);
    setLoading(false);
    if (result.success) {
      setResendTimer(60);
      setCode('');
    } else {
      setError(result.error || 'Could not resend. Try again.');
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Logo / header */}
        <div style={styles.header}>
          <div style={styles.logoMark}>⚾</div>
          <h1 style={styles.title}>Lineup Generator</h1>
          <p style={styles.subtitle}>Mud Hens</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} style={styles.form}>
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
              {loading ? 'Sending…' : 'Send me a code'}
            </button>
            <button
              type="button"
              style={styles.linkBtn}
              onClick={onRequestAccess}
            >
              Don't have access? Request it here
            </button>
          </form>

        ) : (
          <form onSubmit={handleVerify} style={styles.form}>
            <p style={styles.sentMsg}>
              Code sent to <strong>{email}</strong>
            </p>
            <label style={styles.label}>Enter your code</label>
            <input
              ref={codeRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="12345678"
              style={{ ...styles.input, ...styles.codeInput }}
              maxLength={8}
              autoComplete="one-time-code"
              disabled={loading}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.primaryBtn} disabled={loading || code.length < 6}>
              {loading ? 'Verifying…' : 'Log in'}
            </button>
            <button
              type="button"
              style={{
                ...styles.linkBtn,
                color: resendTimer > 0 ? '#aaa' : '#2563eb',
                cursor: resendTimer > 0 ? 'default' : 'pointer',
              }}
              onClick={handleResend}
              disabled={resendTimer > 0 || loading}
            >
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
            </button>
            <button
              type="button"
              style={styles.linkBtn}
              onClick={() => { setStep('email'); setCode(''); setError(''); }}
            >
              ← Use a different email
            </button>
          </form>
        )}

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
    padding: '32px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoMark: {
    fontSize: '36px',
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
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '-4px',
  },
  input: {
    padding: '12px 14px',
    fontSize: '16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: '#0f172a',
    backgroundColor: '#fff',
    transition: 'border-color 0.15s',
  },
  codeInput: {
    fontSize: '28px',
    letterSpacing: '8px',
    textAlign: 'center',
    fontWeight: '600',
  },
  sentMsg: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 4px',
    textAlign: 'center',
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
    transition: 'background-color 0.15s',
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
};
