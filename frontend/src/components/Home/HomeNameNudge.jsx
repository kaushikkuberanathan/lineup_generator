import { useState } from 'react';
import { loadJSON, saveJSON } from '../../utils/storage';

/**
 * HomeNameNudge
 * Home screen → dismissible "add your name" banner (#405, extracted #407).
 *
 * Presentational + owns ONLY its own dismissal. The visibility GATE lives in
 * the parent: `show` carries authState==='authenticated' && user &&
 * user.profile && user.profile.first_name === ''. This component does NOT
 * re-derive that — it just adds the !dismissed check. Never gates viewing.
 *
 * Dismissal persists across sessions via loadJSON/saveJSON
 * ('lg_name_nudge_dismissed'), the same shared storage util App.jsx uses.
 *
 * Props:
 *   show           bool — parent-computed auth+empty-name gate
 *   onOpenAccount  fn   — navigates to the Account tab (parent wires
 *                         setPrimaryTab('more') + setMoreTab('account'))
 */
export function HomeNameNudge({ show, onOpenAccount }) {
  const [dismissed, setDismissed] = useState(function() {
    return !!loadJSON('lg_name_nudge_dismissed', false);
  });

  if (!show || dismissed) { return null; }

  return (
    <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:'8px', padding:'10px 14px', marginBottom:'12px', fontSize:'13px', color:'#065f46', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
      <span
        onClick={onOpenAccount}
        style={{ cursor:'pointer', flex:1 }}>
        &#x1F44B; Add your name so we can greet you by it &rsaquo;
      </span>
      <button
        onClick={function() { saveJSON('lg_name_nudge_dismissed', true); setDismissed(true); }}
        aria-label="Dismiss"
        style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#065f46', flexShrink:0 }}>&#xd7;</button>
    </div>
  );
}
