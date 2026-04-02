/**
 * hooks/useAuth.js
 * Session state management for Phase 4C auth gate.
 *
 * Wraps Supabase auth + backend API calls into a single hook.
 * App.jsx imports this and conditionally renders auth screens
 * vs the main app based on session state.
 *
 * Share link flow bypasses this entirely — ViewerMode renders
 * independently before useAuth is checked.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getDeviceContext } from '../utils/deviceContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.1.0';

// ─── Auth States ──────────────────────────────────────────────────────────────
// 'loading'          — checking existing session on mount
// 'unauthenticated'  — no session, show LoginScreen
// 'pending_approval' — request submitted, waiting for admin
// 'authenticated'    — valid session + membership

export function useAuth() {
  const [authState, setAuthState]   = useState('loading');
  const [session, setSession]       = useState(null);
  const [user, setUser]             = useState(null);
  const [membership, setMembership] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [error, setError]           = useState(null);
  const [teamId, setTeamId]         = useState(
    () => localStorage.getItem('lg_team_id') || ''
  );

  // ─── Check existing session on mount ────────────────────────────────────────

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!existingSession) {
          setAuthState('unauthenticated');
          return;
        }

        // Validate session against backend + get membership
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${existingSession.access_token}` },
        });

        if (!res.ok) {
          // Session expired or invalid — clear it
          await supabase.auth.signOut();
          setAuthState('unauthenticated');
          return;
        }

        const data = await res.json();
        setSession(existingSession);
        setUser(data.user);
        const memberships = data.user.memberships ?? [];
        setMemberships(memberships);
        setMembership(memberships[0] ?? null);
        setAuthState('authenticated');

      } catch {
        setAuthState('unauthenticated');
      }
    }

    checkSession();
  }, []);

  // ─── Request OTP ─────────────────────────────────────────────────────────────

  const requestOtp = useCallback(async (email, tid) => {
    setError(null);
    const resolvedTeamId = tid || teamId;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          teamId: resolvedTeamId,
          deviceContext: getDeviceContext(APP_VERSION),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'NOT_AUTHORIZED') {
          return { success: false, error: 'no_membership' };
        }
        return { success: false, error: data.message || 'Failed to send code' };
      }

      if (resolvedTeamId) {
        localStorage.setItem('lg_team_id', resolvedTeamId);
        setTeamId(resolvedTeamId);
      }

      return { success: true };

    } catch {
      return { success: false, error: 'Network error — check your connection' };
    }
  }, [teamId]);

  // ─── Verify OTP ──────────────────────────────────────────────────────────────

  const verifyOtp = useCallback(async (email, token) => {
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          teamId,
          deviceContext: getDeviceContext(APP_VERSION),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Invalid code' };
      }

      // Restore session into Supabase client
      await supabase.auth.setSession({
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      setSession(data.session);
      setUser(data.user);
      setMembership(data.user.membership ?? null);
      setMemberships(data.user.membership ? [data.user.membership] : []);
      setAuthState('authenticated');

      return { success: true };

    } catch {
      return { success: false, error: 'Network error — check your connection' };
    }
  }, [teamId]);

  // ─── Request Access ───────────────────────────────────────────────────────────

  const requestAccess = useCallback(async ({ firstName, lastName, email, role, tid }) => {
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          teamId: tid || teamId,
          requestedRole: role,
          deviceContext: getDeviceContext(APP_VERSION),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'REQUEST_PENDING') {
          setAuthState('pending_approval');
          return { success: true, pending: true };
        }
        if (data.error === 'ALREADY_APPROVED') {
          return { success: false, error: 'already_approved' };
        }
        return { success: false, error: data.message || 'Request failed' };
      }

      if (tid || teamId) {
        localStorage.setItem('lg_team_id', tid || teamId);
      }
      localStorage.setItem('lg_pending_email', email);

      setAuthState('pending_approval');
      return { success: true };

    } catch {
      return { success: false, error: 'Network error — check your connection' };
    }
  }, [teamId]);

  // ─── Logout ───────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      if (session) {
        await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ teamId }),
        });
      }
    } catch { /* swallow — logout should always succeed client-side */ }

    await supabase.auth.signOut();
    localStorage.removeItem('lg_team_id');
    localStorage.removeItem('lg_pending_email');
    setSession(null);
    setUser(null);
    setMembership(null);
    setMemberships([]);
    setAuthState('unauthenticated');
  }, [session, teamId]);

  return {
    authState,
    session,
    user,
    membership,
    memberships,
    role: membership?.role ?? null,
    error,
    teamId,
    requestOtp,
    verifyOtp,
    requestAccess,
    logout,
  };
}
