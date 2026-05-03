# Accessibility Audit — Non-Game-Mode Surfaces

**Date:** 2026-05-01
**Branch:** `feature/design-tokens`
**Auditor:** Claude Code (recon-driven, values sourced from live codebase scan)
**Recon command:** `.\scripts\recon\a11y-recon.ps1`
**Recon output file:** `recon-output.txt` (worktree root, 117KB)

**Scope:**
- `frontend/src/components/**` excluding `game-mode/` and `ScoringMode/` (parallel session territory)
- `frontend/src/App.jsx` — read-only; all App.jsx findings are deferred

**Locked files reminder:** App.jsx and all files in the locked registry
(`CLAUDE.md`, `migrations.js`, `formatters.js`, `flagBootstrap.js`,
`game-mode/*`, `ScoringMode/*`, `frontend/package.json`, `backend/package.json`)
cannot be edited until KK types the gate phrase `all clear — App.jsx editing approved`.

---

## S1 — Font Sizes Below 12px Floor

**Total hits: 262 [components: 30 | App.jsx (defer): 232]**

The 12px floor is the WCAG minimum for readable text at standard zoom. Values at
9px and below are hard WCAG violations (SC 1.4.4). Values at 10–11px are near-floor
and belong to the v2.5.x migration backlog unless they appear in critical UI contexts.

### Component Files

**`frontend/src/components/GameDay/DefenseDiamond.jsx`** — 7 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L225 | `fontSize:"9px"` | Span: "Inn" position label above the inning selector strip | **WCAG VIOLATION — FIX-NOW** |
| L230 | `fontSize:"11px"` | Bold text in the defense diamond cells | Defer-v2.5.x (xs token) |
| L241 | `fontSize:"11px"` | Defense diamond cell text | Defer-v2.5.x (xs token) |
| L254 | `fontSize:"10px"` | Bold text in bench/table header area | Defer-v2.5.x (near-floor) |
| L257 | `fontSize:"11px"` | Table element font-size base | Defer-v2.5.x (xs token) |
| L262 | `fontSize:"10px"` | `<th>` inning column header ("Inn 1", "Inn 2"...) | Defer-v2.5.x (near-floor) |
| L306 | `fontSize:"9px"` | Bold red text, likely "OUT" or error state indicator | **WCAG VIOLATION — FIX-NOW** |

**`frontend/src/components/GameDay/LockFlow.jsx`** — 3 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L45 | `fontSize:"10px"` | Uppercase span label inside the step progress area | Defer-v2.5.x (near-floor) |
| L87 | `fontSize:"11px"` | Amber warning text inside issue list | Defer-v2.5.x (xs token) |
| L130 | `fontSize:"10px"` | **Duplicate key bug** (see DESIGN_AUDIT.md §A.1): this line sets both `fontSize:"13px"` and `fontSize:"10px"`. JS silently picks 10px. Currently renders section label at 10px instead of intended 13px. | Defer-v2.5.x (requires App.jsx primitives to fix cleanly) |

**`frontend/src/components/GameDay/NowBattingStrip.jsx`** — 2 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L47 | `fontSize:'11px'` | Uppercase inning label ("TOP 1", "BOT 2") | Defer-v2.5.x (xs token) |
| L71 | `fontSize:'10px'` | Position/sub-label below batter name | Defer-v2.5.x (near-floor) |

**`frontend/src/components/GameDay/ParentView.jsx`** — 3 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L56 | `fontSize:"10px"` | "Batting Order" section label (uppercase) | Defer-v2.5.x (near-floor) |
| L63 | `fontSize:"10px"` | "Positions This Game" section label (uppercase) | Defer-v2.5.x (near-floor) |
| L72 | `fontSize:"11px"` | "Inn {i+1}" inning column label | Defer-v2.5.x (xs token) |

**`frontend/src/components/Shared/MaintenanceScreen.jsx`** — 1 hit

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L35 | `fontSize:"11px"` | Supporting text on maintenance screen | Defer-v2.5.x (xs token) |

**`frontend/src/components/Shared/OfflineIndicator.jsx`** — 1 hit

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L30 | `fontSize:"10px"` | Span: "Offline" or "Reconnecting..." status text visible to coach during connectivity issues | **FIX-NOW** (critical status text at near-floor size) |

**`frontend/src/components/Shared/PlayerHandBadge.jsx`** — 1 hit

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L20 | `fontSize:"10px"` | Inline "L" / "R" badge displayed next to player names | Defer-v2.5.x (intentional compact badge; near-floor but design-intentional) |

**`frontend/src/components/Support/FAQSection.jsx`** — 2 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L32 | `fontSize:"11px"` | Category tab label header | Defer-v2.5.x (xs token) |
| L137 | `fontSize:"11px"` | Footer note below FAQ list | Defer-v2.5.x (xs token) |

**`frontend/src/components/Support/LegalSection.jsx`** — 4 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L25 | `fontSize:"11px"` | "Legal & Policies" section header | Defer-v2.5.x (xs token) |
| L56 | `fontSize:"11px"` | Footer note inside legal document view | Defer-v2.5.x (xs token) |
| L102 | `fontSize:"11px"` | Body text in legal document | Defer-v2.5.x (xs token) |
| L151 | `fontSize:"11px"` | Footer text in legal document | Defer-v2.5.x (xs token) |

**`frontend/src/components/Viewer/ViewerMode.jsx`** — 5 hits

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L72 | `fontSize:"10px"` | "Game Day — Read-Only" header label | Defer-v2.5.x (near-floor) |
| L112 | `fontSize:"11px"` | Position abbreviation ("P", "SS", "1B"...) in player card | Defer-v2.5.x (xs token) |
| L116 | `fontSize:"10px"` | Full position label ("Pitcher", "Shortstop"...) in player card | Defer-v2.5.x (near-floor) |
| L123 | `fontSize:"10px"` | "Bench" section uppercase label | Defer-v2.5.x (near-floor) |
| L138 | `fontSize:"10px"` | "Batting Order" section uppercase label | Defer-v2.5.x (near-floor) |

**`frontend/src/components/PlayerHandBadge.jsx`** (root-level copy) — 1 hit

| Line | Value | Context | Category |
|------|-------|---------|----------|
| L18 | `fontSize:"10px"` | Same badge as Shared/PlayerHandBadge.jsx — root-level copy | Defer-v2.5.x (same rationale as above; also: root copy may be a stale duplicate — verify which is imported) |

### App.jsx Summary (read-only — defer to v2.5.x)

**232 hits.** Representative violations below; full list in recon-output.txt lines 63–350.

| Line | Value | Location |
|------|-------|----------|
| L730 | `fontSize:"10px"` | logoSub style in nav header |
| L878 | `fontSize:"9px"` | Position color indicator (WCAG violation) |
| L889 | `fontSize:"9.5px"` | Batting/scheduling table row |
| L890 | `fontSize:"7.5px"` | Inning number label in batting grid (WCAG violation, hardest hit) |
| L970 | `fontSize:"9px"` | "Inn" column label in scoring view |
| L3276 | `fontSize:"9px"` | Team description text |
| L4342 | `fontSize:"7.5px"` | Second occurrence of inning number pattern |
| L4835+ | `fontSize:11` (bare) | Unit-missing bare numerics (×5 occurrences) |

The WCAG violations (7.5px, 9px, 9.5px) in App.jsx are the highest-priority
App.jsx items for the v2.5.x migration. They should be logged in DOC_TEST_DEBT.md
as P1 items when that session begins.

---

## S2 — Explicit Touch Targets Below 44px

**Total hits: 16 [components: 3 | App.jsx (defer): 13]**

### Component Files — All 3 are FALSE POSITIVES

| File | Line | Value | Actual element | Verdict |
|------|------|-------|----------------|---------|
| `Auth/PendingApprovalScreen.jsx` | L117 | `height:'24px'` | `stepIcon` style — decorative green circle with checkmark inside a step row. Non-interactive. | False positive — decorative indicator inside list item |
| `GameDay/LockFlow.jsx` | L40 | `height:"26px"` | Step progress circle (shows step number or ✓). Part of the multi-step stepper header. Non-interactive. | False positive — decorative step indicator |
| `components/PlayerHandBadge.jsx` | L22 | `lineHeight:"16px"` | **Regex false match**: the pattern `(minHeight\|height)` matched `lineHeight`. This is not a height/minHeight property at all. | False positive — regex matched `lineHeight` substring |

**No genuine sub-44px touch target violations found in component files.**

The real touch target concern in this codebase is buttons whose height is determined
entirely by padding (no explicit minHeight), which the recon script cannot catch.
Example: `NowBattingStrip.jsx` prev/next buttons use `btnStyle` (not inlined here) —
those need visual verification to confirm they meet the 44px floor.

### App.jsx Summary (read-only — defer to v2.5.x)

**13 hits.** All appear to be decorative circles, avatar containers, dividers, and
indicator elements — not interactive tap targets. Representative examples:

| Line | Value | Likely element |
|------|-------|----------------|
| L724 | `height:"42px"` | Logo circle |
| L927 | `height:"42px"` | Team avatar circle |
| L1137 | `height:"20px"` | Small status indicator |
| L3106 | `height:"10px"` | Progress bar |
| L5241 | `height:"28px"` | Divider line |
| L5419 | `height:"26px"` | Draggable position chip |
| L6498 | `height:"15px"` | Checkbox input element |

---

## S3 — `<button>` Elements Without `aria-label`

**Total hits: 153 [components: 27 | App.jsx (defer): 126]**

Note: The recon is a single-line heuristic. Multi-line JSX props (aria-label on the
line after `<button`) produce false positives. All flagged lines were manually
reviewed below.

### Component Files — Per-File Triage

**`Auth/LoginScreen.jsx`** — 3 hits (L63, L92, L95) — **DEFER-TO-V2.6.0**

All three are text-content buttons (magic link resend, submit, request access link).
Auth re-skin phase owns these. Self-labeled by visible text content.

**`Auth/PendingApprovalScreen.jsx`** — 1 hit (L55) — **DEFER-TO-V2.6.0**

Text button ("Try logging in" or similar). Auth re-skin phase.

**`Auth/RequestAccessScreen.jsx`** — 2 hits (L156, L160) — **DEFER-TO-V2.6.0**

Submit and back-navigation text buttons. Auth re-skin phase.

**`GameDay/DefenseDiamond.jsx`** — 2 hits

| Line | Content | Verdict |
|------|---------|---------|
| L227 | `<button>All</button>` — inning filter "All" | Self-labeled (visible text) — false positive |
| L238 | `<button key={i}>{i + 1}</button>` — inning filter buttons ("1", "2", ...) | **Needs visual inspection** — number-only content is technically self-labeled but "1" provides no context for screen readers. Suggest `aria-label={"Inning " + (i+1)}` for clarity. Low urgency; FIX-NOW candidate if a one-liner. |

**`GameDay/LockFlow.jsx`** — 5 hits (L93, L99, L105, L143, L148)

All five are text-content buttons: "Cancel", "Lock Anyway →", "Continue to Lock →",
"← Go Back", "Lock Lineup →". All self-labeled by visible text. **False positives.**

**`GameDay/NowBattingStrip.jsx`** — 2 hits (L57, L79) — **FIX-NOW**

```jsx
<button onClick={onBack}  title="Previous batter" style={btnStyle}>‹</button>
<button onClick={onAdvance} title="Next batter"  style={btnStyle}>›</button>
```

Both buttons contain only a single Unicode arrow character. They use `title=` as the
label. `title` is NOT read by mobile screen readers (VoiceOver iOS, TalkBack Android)
in the way `aria-label` is — it is a tooltip for pointer devices only. These are the
only icon-only buttons found in component files and are genuine accessibility gaps.

Fix: replace `title="Previous batter"` with `aria-label="Previous batter"` (and same
for Next). The `title` can stay alongside `aria-label` for sighted-hover tooltip.

**`GameDay/ParentView.jsx`** — 1 hit (L40)

`<button key={p.name}>{fn}</button>` where `fn = firstName(p.name)`. Button text is
the player's first name. Self-labeled. **False positive.**

**`Home/EmptyState.jsx`** — 1 hit (L20)

`<button>+ Create Team</button>`. Self-labeled. **False positive.**

**`Support/FAQSection.jsx`** — 2 hits (L50, L85)

L50: Category filter chip — `{cat.emoji} {cat.label}` (emoji + text label). Self-labeled.
L85: FAQ accordion expand button — contains full question text. Self-labeled.
**Both false positives.**

**`Support/LegalSection.jsx`** — 2 hits (L31, L75)

L31: Legal doc list item — `{doc.emoji}` + `{doc.title}`. Self-labeled. False positive.
L75: Back-navigation button inside an open legal document. Has `onClick={onBack}`.
**Needs visual inspection** — button content not visible from recon line alone.
Context suggests it's a "← Back" or close button; if it contains visible text, it's
a false positive. If it's icon-only, it needs `aria-label="Back"`.

**`ui/Toast.jsx`** — 2 hits (L86, L111)

L86: Action button — renders `{actionLabel}` prop as text content. Self-labeled.
L111: Dismiss button — `aria-label="Dismiss notification"` is on L113 (next line).
Multi-line JSX caused the recon false positive. **Both false positives.**

**`Viewer/ViewerMode.jsx`** — 3 hits (L81, L156, L164)

L81: Inning tab buttons — `INN {i+1}` ("INN 1", "INN 2"...). Self-labeled.
L156: `← Prev` navigation. Self-labeled.
L164: `Next →` navigation. Self-labeled.
**All false positives.**

**`BattingHandSelector.jsx`** — 1 hit (L41)

`<button>{opt.label}</button>` where opt.label is "Left", "Right", or the unknown/
both option. Self-labeled. **False positive.**

### App.jsx Summary (read-only — defer to v2.5.x)

**126 hits.** Recon includes multi-line false positives. The real gaps in App.jsx are
icon-only close buttons (×), icon-only toggle buttons, and inline-styled action buttons
with no accessible label. Exact list available in recon-output.txt lines 466–665.

---

## S4 — `onClick` on `div`/`span`/`li`

**Total hits: 31 [components: 0 | App.jsx (defer): 31]**

No component files have `onClick` on non-button elements. All 31 hits are in App.jsx
and are deferred to v2.5.x. Representative patterns: roster player cards, share sheet
backdrop, logo wrapper, inline skill/tag badges. Each will need `role="button"`,
`aria-label`, and `onKeyDown` when converted to proper interactive elements in v2.5.x.

---

## S5 — Modal Patterns Without `role="dialog"` or `aria-modal`

**Total: 2 files [1 component — LockFlow.jsx | App.jsx (defer)]**

**`frontend/src/components/GameDay/LockFlow.jsx`** — **FIX-NOW**

LockFlow is a multi-step modal sheet (Review Lineup → Confirm Lock → locked state).
It renders with `position:"fixed"` or absolute positioning over the main content and
accepts user interaction for a critical flow (locking the lineup). It qualifies as a
`role="dialog"` pattern.

Current state: no `role`, no `aria-modal`, no `aria-label` on the modal root element.

Fix: add `role="dialog"` `aria-modal="true"` `aria-label="Lock Lineup"` to the
outermost container of the LockFlow render. Also verify focus is moved to the modal
on open (WCAG 2.1 SC 2.4.3 focus order).

**`App.jsx`** — **DEFER-TO-V2.5.X**

App.jsx contains multiple modal-like overlays (share sheet, player detail panels, the
invite/approve flow, team creation sheet). All are deferred. When extracted into
separate components in v2.5.x, each will need `role="dialog"` + `aria-modal` + focus
management.

---

## S6 — `<img>` Without `alt`

**Total: 0 hits anywhere.** No action required.

---

## Categorization Summary

### FIX-NOW (actionable this session, no locked-file edits required)

| # | File | Finding | Section | Fix | Status |
|---|------|---------|---------|-----|--------|
| F1 | `GameDay/DefenseDiamond.jsx` L225 | `fontSize:"9px"` — below project a11y floor (11px allowed in dense bold contexts where 12px overflows tight grids) | S1 | Raise to `fontSize:"11px"` | **RESOLVED** [step-c-commit] |
| F2 | `GameDay/DefenseDiamond.jsx` L306 | `fontSize:"9px"` — below project a11y floor (11px allowed in dense bold contexts where 12px overflows tight grids) | S1 | Raise to `fontSize:"11px"` | **RESOLVED** [step-c-commit] |
| F3 | `Shared/OfflineIndicator.jsx` L30 | `fontSize:"10px"` on critical status text | S1 | Raise to `fontSize:"12px"` | **RESOLVED** [step-c-commit] |
| F4 | `GameDay/NowBattingStrip.jsx` L57 | Icon-only `‹` button uses `title` not `aria-label` | S3 | Replace `title=` with `aria-label="Previous batter"` | **RESOLVED** [step-c-commit] |
| F5 | `GameDay/NowBattingStrip.jsx` L79 | Icon-only `›` button uses `title` not `aria-label` | S3 | Replace `title=` with `aria-label="Next batter"` | **RESOLVED** [step-c-commit] |
| F6 | `GameDay/LockFlow.jsx` | No `role="dialog"` / `aria-modal` / `aria-label` on modal root | S5 | Add `role="dialog"` `aria-modal="true"` `aria-label="Lock Lineup"` to outermost container | **RESOLVED** [step-c-commit] |
| F7 | `GameDay/DefenseDiamond.jsx` | Unselected inning pill text: insufficient contrast against background (WCAG AA 4.5:1) — surfaced on-device | Contrast | Outlined-pill Option A: transparent bg + 1.5px navy border + navy text (unselected); red bg + red border (selected inning); navy bg + navy border (All selected) | **RESOLVED** [step-c-commit] |
| F8 | `Support/LegalSection.jsx` L75 | ~~Back button accessibility check~~ **CLOSED — NO FINDING**: button renders `‹ Back` text; accessible name provided by visible content | S3 | No action needed | **CLOSED** |

### NEEDS VISUAL INSPECTION (fix-now candidates pending confirmation)

| # | File | Finding | Question |
|---|------|---------|----------|
| V1 | `GameDay/DefenseDiamond.jsx` L238 | Inning filter buttons with number-only content ("1", "2"...) | Do these buttons need `aria-label={"Inning " + (i+1)}`? Low impact but a one-liner fix. |
| V2 | `Support/LegalSection.jsx` L75 | ~~Back button — content unclear from recon~~ **CLOSED** — button renders `‹ Back` text; accessible name provided; no fix needed. See F8. | — |
| V3 | `GameDay/NowBattingStrip.jsx` S2 | Prev/Next button tap target size (height determined by `btnStyle`, not inlined) | Visual check needed to confirm final rendered height meets 44px floor. |

### DEFER-TO-V2.5.X (blocked by App.jsx lock or primitive layer)

| What | Count | Reason |
|------|-------|--------|
| App.jsx S1 (sub-12px fonts) | 232 hits | Requires App.jsx edits |
| App.jsx S2 (sub-44px heights) | 13 hits | Requires App.jsx edits; most appear decorative |
| App.jsx S3 (buttons without aria-label) | 126 hits | Requires App.jsx edits |
| App.jsx S4 (onClick on div/span/li) | 31 hits | Requires App.jsx edits + primitive `<Button>` component |
| App.jsx S5 (modals without role) | 1 file | Requires App.jsx edits |
| Component near-floor fonts (10px, 11px labels) | 27 hits | Call-site replacement in v2.5.x primitives |
| LockFlow.jsx L130 duplicate fontSize bug | 1 hit | Intertwined with primitive layer; clean fix requires `<Text>` primitive |
| PlayerHandBadge 10px badge | 2 hits | Intentional compact design; review at call-site replacement |
| LockFlow.jsx step-circle false-positive (S2) | 1 hit | Not a real finding |
| PendingApprovalScreen.jsx stepIcon false-positive (S2) | 1 hit | Not a real finding |
| PlayerHandBadge.jsx lineHeight false-positive (S2) | 1 hit | Not a real finding — regex matched `lineHeight` not `height` |
| LockFlow.jsx Escape key dismissal | 1 | WCAG 2.1 SC 2.1.2 (No Keyboard Trap) — modal should close on Escape. Deferred from F6 recon; requires controlled `onKeyDown` handler or migration to `<dialog>` element |
| LockFlow.jsx focus management on open/close | 1 | WCAG 2.1 SC 2.4.3 (Focus Order) — focus should move into modal on open and return to trigger element on close. Deferred from F6 recon; requires ref-based focus management |

### USABILITY FINDINGS (non-a11y, surfaced during a11y phone testing)

These are not WCAG violations but were flagged during on-device a11y testing. Tracked here for completeness; remediation owned by the UX refactor track.

| # | File | Finding | Priority | Disposition |
|---|------|---------|----------|-------------|
| U1 | `App.jsx` — More tab | Horizontal tab strip overflows in portrait: UPDATES / LINKS / FEEDBACK visible but LEGAL (5th tab) cut off with no scroll affordance | **HIGH** | Defer-v2.5.x — App.jsx locked; fix as part of More tab primitive work |

---

### DEFER-TO-V2.6.0 (Auth re-skin phase)

| What | Count | Reason |
|------|-------|--------|
| `Auth/LoginScreen.jsx` S3 buttons | 3 hits | Auth re-skin owns this surface |
| `Auth/PendingApprovalScreen.jsx` S3 button | 1 hit | Auth re-skin owns this surface |
| `Auth/RequestAccessScreen.jsx` S3 buttons | 2 hits | Auth re-skin owns this surface |

No Auth/* S1 font size violations were found by the recon. Auth screen font sizes
appear to be at or above the 12px floor.

---

## Final Triage Tally

**7 fix-now findings across 4 component files — ALL RESOLVED**
(DefenseDiamond.jsx, OfflineIndicator.jsx, NowBattingStrip.jsx, LockFlow.jsx)
F8 closed as NO FINDING (LegalSection back button has visible text).
Resolved in commit [step-c-commit] on `feature/design-tokens`.

**0 remaining fix-now items.**

**2 needs-visual-inspection items** (V2 closed)
(DefenseDiamond.jsx inning numbers V1, NowBattingStrip.jsx tap target size V3)

**1 usability finding, non-a11y, defer-v2.5.x HIGH**
(U1 — App.jsx More tab horizontal overflow, LEGAL tab cut off in portrait)

**~391 defer-to-v2.5.x findings** (App.jsx: 232+13+126+31+1; components near-floor: 27; plus LockFlow escape key + focus management deferred from F6 recon)

**6 defer-to-v2.6.0 findings** (Auth screens: 6 button findings)

**0 defer-to-v2.6.0 font size findings** (Auth screens are at or above 12px floor)
