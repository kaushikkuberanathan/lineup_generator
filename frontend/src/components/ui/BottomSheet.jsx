import { tokens } from '../../theme/tokens';

/**
 * BottomSheet
 * Phase 5+ primitive — canonical bottom-sheet modal pattern.
 *
 * Encodes the structure formerly inlined in LockFlow.jsx (Story 87):
 * fixed-position backdrop + role=dialog shell anchored to the bottom of
 * the viewport, with a close-handle visual affordance and a body slot.
 * tokens.shadow.sheetTop is consumed exclusively here.
 *
 * Click-to-close fires only when the click target is the backdrop itself
 * (e.target === e.currentTarget) — clicks on the dialog or its children
 * do not close.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - ariaLabel: string                accessible name for the dialog
 *  - maxWidth?: string                default '480px'
 *  - maxHeight?: string               default '80vh'
 *  - children: ReactNode              body content rendered inside the dialog
 */
export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  maxWidth = '480px',
  maxHeight = '80vh',
  children,
}) {
  if (!open) return null;

  return (
    <div
      onClick={function (e) { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{
          background: tokens.color.surface.card,
          // 16px — 4px above tokens.radius.lg; no sheet token
          borderRadius: '16px 16px 0 0',
          padding: '24px 20px 32px',
          width: '100%',
          maxWidth,
          maxHeight,
          overflowY: 'auto',
          boxShadow: tokens.shadow.sheetTop,
        }}
      >
        <div
          data-testid="bs-handle"
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            background: tokens.color.overlay.navyMedium,
            margin: '-8px auto 20px',
          }}
        />
        {children}
      </div>
    </div>
  );
}
