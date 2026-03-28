# iOS PWA Install Coaching Overlay

**Status:** Backlog — Ready to Implement
**Target version:** 1.4.1
**Effort:** Small (frontend only)
**Last updated:** March 28, 2026

---

## Background

On iOS Safari, there is no `beforeinstallprompt` event and no programmatic way to trigger a PWA install prompt. The only install path is fully manual:

1. Tap the Share icon (bottom center in Safari)
2. Scroll down
3. Tap "Add to Home Screen"
4. Tap "Add" to confirm

Without active UI coaching, the vast majority of iOS users will never discover this flow. This is a known high-drop-off point for PWAs on iOS.

---

## Goal

Show a bottom-sheet coaching overlay to iOS Safari users who have not yet installed the app, at a moment of high intent — not on cold first load.

---

## Device Detection

```js
const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

// Covers both modern media query AND legacy iOS Safari boolean
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
```

---

## Trigger Logic

| Condition | Show? |
|-----------|-------|
| iOS Safari, 2nd+ visit, not installed, not dismissed | ✅ Yes (automatic) |
| iOS Safari, lineup just generated, not installed, not dismissed | ✅ Yes (imperative) |
| iOS Safari, 1st visit only | ❌ No (too early) |
| Already in standalone mode (app installed) | ❌ No |
| Previously dismissed by user | ❌ No (persisted in localStorage) |
| Android / Desktop | ❌ No (use `beforeinstallprompt` instead) |

---

## localStorage Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `ios_install_dismissed` | `'true'` | Permanent dismiss flag |
| `ios_install_visit_count` | `'1'`, `'2'`, … | Track visits to gate 2nd+ trigger |

---

## Imperative Trigger (window global)

After the hook is wired in App.jsx, expose a global so any component can fire it without prop drilling:

```js
window.triggerIOSInstallPrompt = triggerIOSBanner;
```

**Call this after:**
- Lineup generation completes successfully
- User taps a Share Lineup button (future)
- Any high-intent action where install would add value

Usage anywhere in the app:

```js
if (window.triggerIOSInstallPrompt) window.triggerIOSInstallPrompt();
```

---

## UI Spec — Bottom Sheet Overlay

**Layout:**
- Fixed position, bottom of screen, full width
- Rounded top corners (`borderRadius: "16px 16px 0 0"`)
- Slide-up entrance animation (CSS keyframes, injected via `<style>` tag — no new CSS file)
- Full-screen semi-transparent backdrop — tap backdrop to dismiss (same as "Got it")

**Content:**

```
⚾ Lineup Generator

Install this app for faster game day access

1. Tap the Share icon ⬆️ at the bottom of Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm

[ Got it ✓ ]        ← full-width accent green button
Don't show again     ← small text link, same dismiss behavior
▼                    ← subtle caret pointing toward Safari toolbar
```

**Styling:**
- Use existing CSS variables from the app (check App.jsx / index.css)
- Fallback palette: background `#1a1a2e`, accent `#4CAF50`, text white
- No new npm packages
- No icon library imports — use Unicode/emoji only

---

## Hook Spec — `useIOSInstallPrompt.js`

```js
// frontend/src/hooks/useIOSInstallPrompt.js
import { useState, useEffect } from 'react';

export function useIOSInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true;
    const dismissed = localStorage.getItem('ios_install_dismissed') === 'true';

    if (!isIOS || isStandalone || dismissed) return;

    // Increment visit count
    const count = parseInt(localStorage.getItem('ios_install_visit_count') || '0', 10) + 1;
    localStorage.setItem('ios_install_visit_count', String(count));

    // Auto-show on 2nd+ visit
    if (count >= 2) setShowBanner(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('ios_install_dismissed', 'true');
    setShowBanner(false);
  };

  const trigger = () => {
    const dismissed = localStorage.getItem('ios_install_dismissed') === 'true';
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true;
    if (!dismissed && !isStandalone) setShowBanner(true);
  };

  return { showBanner, dismiss, trigger };
}
```

---

## Component Spec — `IOSInstallBanner.jsx`

```jsx
// frontend/src/components/IOSInstallBanner.jsx
import React, { useEffect } from 'react';

const SLIDE_UP_KEYFRAMES = `
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`;

export function IOSInstallBanner({ onDismiss }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = SLIDE_UP_KEYFRAMES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#1a1a2e',
        borderRadius: '16px 16px 0 0',
        padding: '24px 20px 36px',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease-out',
        color: '#fff',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '6px' }}>⚾ Lineup Generator</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '18px' }}>
          Install this app for faster game day access
        </div>
        <ol style={{ paddingLeft: '18px', marginBottom: '20px', lineHeight: 1.7, fontSize: '14px' }}>
          <li>Tap the <strong>Share icon ⬆️</strong> at the bottom of Safari</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>Tap <strong>"Add"</strong> to confirm</li>
        </ol>
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '14px',
            background: '#4CAF50', color: '#fff',
            border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: 'bold',
            cursor: 'pointer', marginBottom: '12px',
          }}>
          Got it ✓
        </button>
        <div
          onClick={onDismiss}
          style={{
            textAlign: 'center', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer', textDecoration: 'underline',
          }}>
          Don't show again
        </div>
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '18px', opacity: 0.3 }}>▼</div>
      </div>
    </>
  );
}
```

---

## App.jsx Integration (MODIFY)

```jsx
// 1. Import at top of App.jsx
import { useIOSInstallPrompt } from './hooks/useIOSInstallPrompt';
import { IOSInstallBanner } from './components/IOSInstallBanner';

// 2. Inside App() component body — add hook
const { showBanner, dismiss, trigger } = useIOSInstallPrompt();

// 3. Expose imperative trigger globally (after hook call)
useEffect(() => {
  window.triggerIOSInstallPrompt = trigger;
  return () => { delete window.triggerIOSInstallPrompt; };
}, [trigger]);

// 4. After lineup generation completes, call:
if (window.triggerIOSInstallPrompt) window.triggerIOSInstallPrompt();

// 5. In JSX — render banner at bottom of root return (above renderPinModal)
{showBanner && <IOSInstallBanner onDismiss={dismiss} />}
```

---

## Test Checklist

- [ ] Overlay does NOT appear on first iOS visit
- [ ] Overlay appears automatically on 2nd+ iOS visit (not dismissed)
- [ ] Overlay appears after lineup generation on iOS (imperative trigger)
- [ ] "Got it" dismisses overlay and sets `ios_install_dismissed = 'true'`
- [ ] "Don't show again" has same behavior as "Got it"
- [ ] Tapping backdrop dismisses overlay
- [ ] Overlay does NOT appear after dismissal, even on repeat visits
- [ ] Overlay does NOT appear if app is already in standalone mode
- [ ] Overlay does NOT appear on Android or desktop
- [ ] Slide-up animation plays correctly
- [ ] Caret (▼) visually points toward Safari toolbar at screen bottom
