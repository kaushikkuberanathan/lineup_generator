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
import { clearPendingDestination } from '../api/routes.js';
import { clearAllHomeCaches } from '../api/homeCache.js';

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
      if (!supabase) {
        setAuthState('unauthenticated');
        return;
      }
      // Tracks whether this load carried a callback token, so the two
      // silent-fallback branches below can distinguish "never logged in"
      // (normal, no log needed) from "a callback token didn't produce a
      // usable session" (an anomaly worth a trace — this is exactly the
      // class of failure that took real production debugging to diagnose
      // in 2026-08-22's login incident, precisely because these paths
      // logged nothing). Never log the token itself, only that one was
      // present and what happened next.
      const hadCallbackToken = window.location.hash.includes('access_token');
      try {
        // Handle Supabase auth redirect (magic link callback)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          // Let Supabase parse the hash and establish the session
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[useAuth] session error:', error.message);
            window.history.replaceState(null, '', window.location.pathname);
            setAuthState('unauthenticated');
            return;
          }
          if (data?.session) {
            window.history.replaceState(null, '', window.location.pathname);
            // Continue — the getSession() call below will pick it up
          }
        }

        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!existingSession) {
          if (hadCallbackToken) {
            console.error('[useAuth] callback URL had a token but no session was established');
          }
          setAuthState('unauthenticated');
          return;
        }

        // Validate session against backend + get membership
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${existingSession.access_token}` },
        });

        if (!res.ok) {
          // Session expired or invalid — clear it
          console.error('[useAuth] /me rejected an established session:', res.status);
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
        if (memberships.length === 0) {
          // Signed in, but not a member of any team. Happens when a session
          // exists without a membership - e.g. a Google sign-in (no pre-send
          // membership check like magic link has), or a membership revoked
          // between link-send and click. RLS shows this user nothing anyway;
          // we route them to an honest screen rather than an empty app. #394
          setAuthState('no_membership');
        } else {
          setAuthState('authenticated');
        }

      } catch (err) {
        console.error('[useAuth] checkSession threw:', err?.name, err?.message);
        setAuthState('unauthenticated');
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          // Fetch membership from backend
          try {
            const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
              headers: { Authorization: `Bearer ${newSession.access_token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setSession(newSession);
              setUser(data.user);
              const memberships = data.user.memberships ?? [];
              setMemberships(memberships);
              setMembership(memberships[0] ?? null);
              if (memberships.length === 0) {
                // Signed in, but not a member of any team. Happens when a session
                // exists without a membership - e.g. a Google sign-in (no pre-send
                // membership check like magic link has), or a membership revoked
                // between link-send and click. RLS shows this user nothing anyway;
                // we route them to an honest screen rather than an empty app. #394
                setAuthState('no_membership');
              } else {
                setAuthState('authenticated');
              }
              // Clear hash from URL
              if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname);
              }
            } else {
              // #579: previously a silent no-op here left the user stranded on
              // whatever screen they were already on (typically LoginScreen)
              // with a live Supabase session and zero feedback. Mirror
              // checkSession's handling of the same /me-rejected case: log for
              // diagnostics, surface an error, and explicitly re-settle so the
              // UI isn't left wedged in an ambiguous state.
              console.error('[useAuth] onAuthStateChange: /me rejected after SIGNED_IN:', res.status);
              setError('We could not finish signing you in. Please try again.');
              setAuthState('unauthenticated');
            }
          } catch (err) {
            console.error('[useAuth] onAuthStateChange error:', err.message);
            setError('We could not finish signing you in. Please try again.');
            setAuthState('unauthenticated');
          }
        }
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setMembership(null);
          setMemberships([]);
          setAuthState('unauthenticated');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ─── Send Magic Link ─────────────────────────────────────────────────────────

  const sendMagicLink = useCallback(async (email, tid) => {
    const resolvedTeamId = tid || teamId;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/magic-link`, {
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
        return { success: false, error: data.message || 'Failed to send link' };
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

  // ─── Request Access ───────────────────────────────────────────────────────────

  const requestAccess = useCallback(async ({ firstName, lastName, email, role, tid }, { preserveSession } = {}) => {
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
          if (!preserveSession) { setAuthState('pending_approval'); }
          return { success: true, pending: true };
        }
        if (data.error === 'ALREADY_APPROVED') {
          return { success: false, error: 'already_approved' };
        }
        return { success: false, error: data.message || 'Request failed' };
      }

      if (!preserveSession) {
        if (tid || teamId) {
          localStorage.setItem('lg_team_id', tid || teamId);
        }
        localStorage.setItem('lg_pending_email', email);
        setAuthState('pending_approval');
      }
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
    // #1032: clear the departing user's stashed deep link and every
    // cached Home response on this device. getHomeCache() is already
    // scoped per-userId (so a different coach signing in next never
    // reads someone else's cache), but leaving stale entries around
    // after logout is unnecessary retention on a shared device.
    clearPendingDestination();
    clearAllHomeCaches();
    setSession(null);
    setUser(null);
    setMembership(null);
    setMemberships([]);
    setAuthState('unauthenticated');
  }, [session, teamId]);

  // ─── Update Profile Name ────────────────────────────────────────────────────────
  // PATCH /me with the signed-in user's name (#405), then re-fetch /me and set
  // `user` from that response — the re-fetch IS the state update (no optimistic
  // in-place patch). Token comes from the current session, never a caller arg.
  // Every failure path leaves existing `user` state untouched.

  // ─── Refresh Memberships ─────────────────────────────────────────────────────
  // Re-fetches /me and updates memberships/membership only — does not touch
  // authState or user. Used after a client action that provisions a new
  // membership row server-side (e.g. team creation) so the newly-created team
  // becomes visible in membership-filtered views without a full reload. #729

  const refreshMemberships = useCallback(async () => {
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const ms = data.user?.memberships ?? [];
      setMemberships(ms);
      setMembership(ms[0] ?? null);
    } catch { /* best-effort — caller keeps existing membership state on failure */ }
  }, [session]);

  const updateProfileName = useCallback(async (firstName, lastName) => {
    if (!session) return { success: false, error: 'Not signed in' };

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      if (!res.ok) {
        let message = 'Could not save your name. Please try again.';
        try {
          const data = await res.json();
          message = data.message || data.error || message;
        } catch { /* non-JSON error body — keep default message */ }
        return { success: false, error: message };
      }

      // Re-fetch /me and set user from that response (mirrors the read path in
      // checkSession / onAuthStateChange). Do NOT extract or touch those sites.
      const meRes = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!meRes.ok) {
        return { success: false, error: 'Saved, but could not refresh — reload to see the change.' };
      }
      const data = await meRes.json();
      setUser(data.user);

      return { success: true };

    } catch {
      return { success: false, error: 'Network error — check your connection' };
    }
  }, [session]);

  return {
    authState, setAuthState,
    session,
    user,
    membership,
    memberships,
    role: membership?.role ?? null,
    error,
    teamId,
    sendMagicLink,
    requestAccess,
    logout,
    updateProfileName,
    refreshMemberships,
  };
}
