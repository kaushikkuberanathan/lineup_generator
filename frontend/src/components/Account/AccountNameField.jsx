import { useState, useEffect } from 'react';
import { tokens } from '../../theme/tokens';
import { Button } from '../ui/Button';

/**
 * AccountNameField
 * Support → Account sub-tab: the editable coach-name form (#405, extracted #407).
 *
 * Owns ALL of its own state (moved verbatim out of App.jsx renderAccount):
 * the two inputs, the saving flag, and the three-state feedback. The parent
 * passes only the useAuth PATCH fn and the prefill values.
 *
 * Prefill: state initializes from initialFirstName/initialLastName, and a
 * useEffect re-syncs when those props change — this mirrors the post-save
 * /me re-fetch in App.jsx (a successful save updates user.profile, which the
 * parent feeds back down as new initial* props).
 *
 * Feedback contract (preserved verbatim from #405):
 *   success                          → { kind: 'success', text: 'Saved' }   (#065f46)
 *   updateProfileName resolved false
 *     with "could not refresh" copy  → { kind: 'refresh', text: <as-is> }   (#92620a)
 *     any other failure              → { kind: 'error',   text: <msg> }     (tokens.color.brand.red)
 * The 'refresh' branch is stringly-typed on purpose: that path means the write
 * DID land but the re-fetch failed, so it must never read as a lost-save error.
 *
 * Props:
 *   updateProfileName  fn     — useAuth's PATCH /me; (firstName, lastName) => { success, error }
 *   initialFirstName   string — prefill + re-sync source (user.profile.first_name)
 *   initialLastName    string — prefill + re-sync source (user.profile.last_name)
 *   S                  object — legacy style objects (App.jsx) — uses S.input, S.btn
 */
export function AccountNameField({ updateProfileName, initialFirstName, initialLastName, S, contemporary = false }) {
  const [accountFirstName, setAccountFirstName] = useState(initialFirstName || '');
  const [accountLastName, setAccountLastName] = useState(initialLastName || '');
  const [accountNameSaving, setAccountNameSaving] = useState(false);
  const [accountNameFeedback, setAccountNameFeedback] = useState(null); // { kind:'success'|'refresh'|'error', text }

  // Re-sync inputs when the prefill props change — mirrors the post-save
  // /me re-fetch: a successful save updates the profile upstream, which the
  // parent feeds back down as new initial* values.
  useEffect(function() {
    setAccountFirstName(initialFirstName || '');
    setAccountLastName(initialLastName || '');
  }, [initialFirstName, initialLastName]);

  async function handleSaveAccountName() {
    if (accountNameSaving || !accountFirstName.trim()) { return; }
    setAccountNameSaving(true);
    setAccountNameFeedback(null);
    var res = await updateProfileName(accountFirstName.trim(), accountLastName.trim());
    setAccountNameSaving(false);
    if (res && res.success) {
      setAccountNameFeedback({ kind: 'success', text: 'Saved' });
      return;
    }
    // updateProfileName's "saved but couldn't refresh" copy — the write DID
    // land, so surface it as-is (neutral), never as a generic lost-save error.
    var msg = (res && res.error) ? res.error : 'Could not save. Please try again.';
    var savedButStale = msg.indexOf('could not refresh') !== -1;
    setAccountNameFeedback({ kind: savedButStale ? 'refresh' : 'error', text: msg });
  }

  return (
    <div style={{ paddingBottom:"14px", borderBottom:"1px solid " + tokens.color.border.neutral, marginBottom:"14px" }}>
      <div style={{ fontSize:"11px", letterSpacing:"0.08em", textTransform:"uppercase", color:tokens.color.text.muted, marginBottom:"8px" }}>Your name</div>
      <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"8px" }}>
        <input
          value={accountFirstName}
          onChange={function(e) { setAccountFirstName(e.target.value); if (accountNameFeedback) { setAccountNameFeedback(null); } }}
          placeholder="First name*" maxLength={100}
          style={{ ...S.input, flex:"1 1 120px", ...(contemporary ? { minHeight: '44px', borderRadius: tokens.radius.md, borderColor: tokens.color.border.default } : {}) }} />
        <input
          value={accountLastName}
          onChange={function(e) { setAccountLastName(e.target.value); if (accountNameFeedback) { setAccountNameFeedback(null); } }}
          placeholder="Last name" maxLength={100}
          style={{ ...S.input, flex:"1 1 120px", ...(contemporary ? { minHeight: '44px', borderRadius: tokens.radius.md, borderColor: tokens.color.border.default } : {}) }} />
      </div>
      {contemporary ? <Button
        variant="primary"
        typography="contemporary"
        fullWidth
        loading={accountNameSaving}
        disabled={!accountFirstName.trim()}
        onClick={handleSaveAccountName}
      >Save profile</Button> : <button
        onClick={handleSaveAccountName}
        disabled={accountNameSaving || !accountFirstName.trim()}
        style={{ ...S.btn("primary"), width:"100%",
          opacity: (accountNameSaving || !accountFirstName.trim()) ? 0.5 : 1,
          cursor:  (accountNameSaving || !accountFirstName.trim()) ? "default" : "pointer" }}>
        {accountNameSaving ? "Saving…" : "Save"}
      </button>}
      {accountNameFeedback ? (
        <div style={{ marginTop:"8px", fontSize:"12px", fontWeight:"600",
          color: accountNameFeedback.kind === 'success' ? "#065f46"
               : accountNameFeedback.kind === 'refresh' ? "#92620a"
               : tokens.color.brand.red }}>
          {accountNameFeedback.kind === 'success' ? "✓ " : ""}{accountNameFeedback.text}
        </div>
      ) : null}
    </div>
  );
}
