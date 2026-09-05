/**
 * components/Auth/RequestAccessScreen.jsx
 * Access request form — coaches, coordinators, scorekeepers, and parents
 * requesting view-only access. 5 role options as of 2026-08-08 (Story
 * 124/#655); see docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md's role-model
 * table for the full label → stored-value → normalizeRole() mapping.
 * Pre-fills team and role from URL params.
 *
 * URL params:
 *   ?team=1774297491626  — pre-fills team ID
 *   ?role=coach          — pre-fills role
 *   ?terms=open          — auto-opens the Terms of Service sheet on load
 *                          (the "deep link" a support email or the Account
 *                          tab's Terms of Service row can send someone to;
 *                          see Legal/LegalDocSheet.jsx)
 *
 * Terms of Service consent: added alongside the Account tab's own Terms of
 * Service entry point (both render content/legal.js's current doc version
 * through the same LegalDocBody component — see that file's header comment
 * for why there is exactly one copy of this text). A coach can't submit an
 * access request without checking "I agree" first.
 *
 * What gets persisted is only the VERSION each doc was at when the coach
 * checked the box (getCurrentLegalVersion), never the text — logged via a
 * separate, non-blocking call to POST /api/v1/auth/consent (see
 * utils/legalConsent.js and migration 028's legal_consents table). Bumping
 * a document's text later (content/legal.js) is the only change needed for
 * the next coach to see and consent to the new version — nothing here
 * hardcodes a version number.
 *
 * On submit: POST /auth/request-access → PendingApprovalScreen
 */

import { useState, useEffect } from 'react';
import { track } from '@/utils/analytics';
import { tokens } from "../../theme/tokens";
import { getLegalDoc } from "../../content/legal";
import { LegalDocSheet } from "../Legal/LegalDocSheet";
import { logLegalConsent } from "../../utils/legalConsent";
import { AuthWorkspace } from './AuthWorkspace';

const TEAM_ID = import.meta.env.VITE_DEFAULT_TEAM_ID || '1774297491626';
const TERMS_DOC = getLegalDoc('terms');
const PRIVACY_DOC = getLegalDoc('privacy');

// Label layer (WS-1 #336): what the coach SEES is richer than what we STORE.
// `value` is sent to POST /request-access as `requestedRole`; the backend's
// normalizeRole() (backend/src/lib/normalizeRole.js) translates it to one of
// 4 DB canonicals (admin/coach/scorekeeper/viewer). team_admin -> admin and
// coordinator -> coach is the deliberate, accepted state (Option B) — NOT a
// gap awaiting a backend fix. Promoting coordinator to its own canonical
// role (Option A) is a real decision, explicitly deferred to Story 125
// (#656) until Phase 4C unblocks it. Do not "fix" this mapping as part of
// unrelated work.
const ROLE_OPTIONS = [
  { id: 'head_coach',      value: 'team_admin',  label: 'Head Coach',
    note: 'Requires manual review before approval' },
  { id: 'assistant_coach', value: 'coach',        label: 'Assistant Coach' },
  { id: 'coordinator',     value: 'coordinator',  label: 'Team Coordinator' },
  { id: 'scorekeeper',     value: 'scorekeeper',  label: 'Scorekeeper' },
  { id: 'parent',          value: 'viewer',       label: 'Parent / Family' },
];

function LegacyAccessWorkspace({ children }) {
  return <div style={styles.container}><div style={styles.card}>{children}</div></div>;
}

export function RequestAccessScreen({
  onBack,
  requestAccess,
  preselectedTeam = null,
  preserveSession = false,
  backLabel = '← Back to login',
  contemporary = false,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [roleId, setRoleId]       = useState('assistant_coach');
  const [teamId, setTeamId]       = useState(preselectedTeam ? preselectedTeam.id : '');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [openLegalDoc, setOpenLegalDoc]   = useState(null); // "terms" | "privacy" | null

  const selectedRoleOption = ROLE_OPTIONS.find(r => r.id === roleId);

  // Pre-fill from URL params; ?terms=open deep-links straight into the ToS sheet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam && ROLE_OPTIONS.find(r => r.id === roleParam)) {
      setRoleId(roleParam);
    }
    if (params.get('terms') === 'open') {
      setOpenLegalDoc('terms');
      track("tos_link_opened", { source: "deep_link" });
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!firstName.trim()) return setError('First name is required');
    if (!lastName.trim())  return setError('Last name is required');
    if (!email.trim())     return setError('Email address is required');
    if (!email.includes('@')) return setError('Enter a valid email address');
    if (!teamId.trim() && !TEAM_ID) return setError('Team ID is required');
    if (!agreedToTerms) return setError('Please agree to the Terms of Service to continue');

    setError('');
    setLoading(true);

    const consentEmail = email.trim().toLowerCase();
    track("tos_consented", { version: TERMS_DOC ? TERMS_DOC.version : null });
    // Fire-and-forget: this is a supplementary audit record, not a gate.
    // logLegalConsent never throws — see its own header comment.
    logLegalConsent({
      email: consentEmail,
      consents: [TERMS_DOC, PRIVACY_DOC]
        .filter(Boolean)
        .map(function (doc) { return { docId: doc.id, version: doc.version }; }),
      context: 'request_access',
    });

    const result = await requestAccess({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     consentEmail,
      role:      selectedRoleOption.value,
      tid:       teamId.trim() || TEAM_ID,
    }, { preserveSession });

    setLoading(false);

    if (!result.success) {
      if (result.error === 'already_approved') {
        setError('This email already has access. Try logging in instead.');
      } else {
        setError(result.error || 'Something went wrong. Try again.');
      }
    } else {
      track("access_requested", { team_id: teamId.trim() || TEAM_ID });
      if (preserveSession) { setSubmitted(true); }
    }
    // On success: preserveSession=true (already-authenticated coach requesting
    // a 2nd team) shows the inline confirmation below, added 2026-08-11.
    // preserveSession=false (the default, pre-auth flow) is unchanged —
    // useAuth still sets authState → 'pending_approval', which App.jsx
    // renders as PendingApprovalScreen.
  }

  const AccessWorkspace = contemporary ? AuthWorkspace : LegacyAccessWorkspace;
  const workspaceTitle = preserveSession && submitted ? 'Request sent' : 'Request access';
  const workspaceSubtitle = preserveSession && submitted
    ? `${preselectedTeam ? preselectedTeam.name : 'Your request'} · Pending approval`
    : 'Join your Dugout Lineup team';

  return (
    <>
      <AccessWorkspace title={workspaceTitle} subtitle={workspaceSubtitle} icon={preserveSession && submitted ? 'success' : undefined} compact>

        {preserveSession && submitted ? (
        <div style={styles.header}>
          {!contemporary ? <><div style={styles.logoMark}>
            <img src="/pwa-192x192.png" alt="Dugout Lineup" width="56" height="56" />
          </div>
          <h1 style={styles.title}>Request Sent</h1>
          <p style={styles.subtitle}>
            {preselectedTeam ? preselectedTeam.name : 'Your request'} · Pending approval
          </p></> : null}
          <p style={{ ...styles.note, marginTop: '16px' }}>
            You&apos;ll get an email once your request to join{' '}
            {preselectedTeam ? preselectedTeam.name : 'this team'} as{' '}
            {selectedRoleOption.label} is approved — usually within a few hours.
          </p>
          <button type="button" style={{ ...(contemporary ? styles.primaryBtnContemporary : styles.primaryBtn), marginTop: '20px' }} onClick={onBack}>
            Done
          </button>
        </div>
        ) : (
        <>
        {!contemporary ? <div style={styles.header}>
          <div style={styles.logoMark}>
            <img src="/pwa-192x192.png" alt="Dugout Lineup" width="56" height="56" />
          </div>
          <h1 style={styles.title}>Request Access</h1>
          <p style={styles.subtitle}>Mud Hens · Dugout Lineup</p>
        </div> : null}

        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label} htmlFor="request-access-first-name">First name</label>
              <input
                id="request-access-first-name"
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
              <label style={styles.label} htmlFor="request-access-last-name">Last name</label>
              <input
                id="request-access-last-name"
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
            <label style={styles.label} htmlFor="request-access-email">Email address</label>
            <input
              id="request-access-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              style={styles.input}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {preselectedTeam ? (
            <div>
              <label style={styles.label}>Team</label>
              <div style={styles.preselectedTeam}>
                {preselectedTeam.name}
                {preselectedTeam.age_group ? <span style={{ color: tokens.color.text.secondary, fontWeight: 400 }}> · {preselectedTeam.age_group}</span> : null}
              </div>
            </div>
          ) : (
            <div>
              <label style={styles.label} htmlFor="request-access-team-id">Team ID <span style={{ color: tokens.color.text.tertiary, fontWeight: 400 }}>(optional — leave blank for Mud Hens)</span></label>
              <input
                id="request-access-team-id"
                type="text"
                value={teamId}
                onChange={e => { setTeamId(e.target.value); setError(''); }}
                placeholder={TEAM_ID}
                style={styles.input}
                autoComplete="off"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label style={styles.label} htmlFor="request-access-role">Your role</label>
            <select
              id="request-access-role"
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            {selectedRoleOption?.note && (
              <p style={styles.roleNote}>{selectedRoleOption.note}</p>
            )}
          </div>

          <label style={styles.consentRow} htmlFor="request-access-consent">
            <input
              type="checkbox"
              id="request-access-consent"
              checked={agreedToTerms}
              onChange={e => { setAgreedToTerms(e.target.checked); setError(''); }}
              style={styles.consentCheckbox}
              disabled={loading}
            />
            <span style={styles.consentText}>
              I agree to the{' '}
              <button
                type="button"
                style={styles.consentLink}
                onClick={() => { setOpenLegalDoc('terms'); track("tos_link_opened", { source: "checkbox_label" }); }}
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button
                type="button"
                style={styles.consentLink}
                onClick={() => { setOpenLegalDoc('privacy'); track("tos_link_opened", { source: "checkbox_label", doc: "privacy" }); }}
              >
                Privacy Policy
              </button>
            </span>
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={agreedToTerms ? (contemporary ? styles.primaryBtnContemporary : styles.primaryBtn) : styles.primaryBtnDisabled}
            disabled={loading || !agreedToTerms}
            aria-disabled={loading || !agreedToTerms}
          >
            {loading ? 'Submitting…' : 'Request access'}
          </button>

          <button type="button" style={contemporary ? styles.secondaryBtnContemporary : styles.linkBtn} onClick={onBack}>
            {backLabel}
          </button>

        </form>

        <p style={styles.note}>
          Dugout Lineup&apos;s admin team will review your request and you&apos;ll
          receive an email when approved — usually within a few hours.
        </p>

        </>
        )}

      </AccessWorkspace>

      <LegalDocSheet
        open={!!openLegalDoc}
        docId={openLegalDoc}
        onClose={() => setOpenLegalDoc(null)}
      />
    </>
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
    maxWidth: '420px',
    backgroundColor: tokens.color.surface.card,
    borderRadius: '16px',
    padding: '32px 28px',
    boxShadow: tokens.shadow.card,
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoMark: {
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '600',
    color: tokens.color.text.primary,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: tokens.color.text.secondary,
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
    color: tokens.color.text.body,
    marginBottom: '4px',
    display: 'block',
  },
  input: {
    padding: '11px 13px',
    fontSize: '16px',
    border: `1.5px solid ${tokens.color.border.default}`,
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.card,
  },
  select: {
    padding: '11px 13px',
    fontSize: '15px',
    border: `1.5px solid ${tokens.color.border.default}`,
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.card,
    cursor: 'pointer',
  },
  roleNote: {
    margin: '6px 0 0',
    fontSize: '12px',
    color: tokens.color.status.warningText,
  },
  consentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '4px 2px',
    cursor: 'pointer',
    minHeight: '44px',
  },
  consentCheckbox: {
    marginTop: '2px',
    width: '18px',
    height: '18px',
    flexShrink: 0,
    accentColor: tokens.color.status.info,
    cursor: 'pointer',
  },
  consentText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: tokens.color.text.body,
  },
  consentLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    font: 'inherit',
    fontWeight: '600',
    color: tokens.color.status.info,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  preselectedTeam: {
    padding: '11px 13px',
    fontSize: '15px',
    border: `1.5px solid ${tokens.color.border.default}`,
    borderRadius: '10px',
    width: '100%',
    boxSizing: 'border-box',
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.page,
  },
  primaryBtn: {
    padding: '13px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: tokens.color.status.info,
    color: tokens.color.text.onDark,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  primaryBtnContemporary: {
    width: '100%', minHeight: '44px', padding: '13px', fontSize: '16px', fontWeight: '600',
    backgroundColor: tokens.color.brand.gold, color: tokens.color.brand.navy,
    border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer',
  },
  // Visually distinct from primaryBtn — without this, a `disabled` button
  // whose background/color are set inline (as primaryBtn's are) shows no
  // visual difference from enabled: browsers don't override an explicit
  // inline background-color/color for :disabled, so "disabled" was
  // functionally real (clicking did nothing) but invisible to the user
  // until they'd already tried. tokens.color.text.disabled is this repo's
  // established gray-400 "disabled states" token.
  primaryBtnDisabled: {
    padding: '13px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: tokens.color.text.disabled,
    color: tokens.color.text.onDark,
    border: 'none',
    borderRadius: '10px',
    cursor: 'not-allowed',
    marginTop: '4px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: tokens.color.status.info,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'center',
  },
  secondaryBtnContemporary: {
    width: '100%',
    minHeight: '44px',
    padding: '11px 13px',
    backgroundColor: tokens.color.surface.card,
    border: `1px solid ${tokens.color.border.default}`,
    borderRadius: tokens.radius.md,
    color: tokens.color.brand.navy,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  error: {
    margin: '0',
    fontSize: '13px',
    color: tokens.color.status.error,
    padding: '8px 12px',
    backgroundColor: tokens.color.status.errorBg,
    borderRadius: '8px',
    border: `1px solid ${tokens.color.status.errorBorder}`,
  },
  note: {
    marginTop: '20px',
    fontSize: '12px',
    color: tokens.color.text.tertiary,
    textAlign: 'center',
    lineHeight: '1.5',
  },
};
