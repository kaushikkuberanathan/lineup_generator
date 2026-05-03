import { useEffect, useRef, useState, useCallback } from 'react';
import { tokens } from "../../theme/tokens";

var FF = "Georgia,'Times New Roman',serif";

/**
 * Top-anchored transient notification, styled to match the project's
 * inline-style convention (slate-blue card surface used in scoring views).
 *
 * Props:
 *  - open: boolean
 *  - message: string
 *  - actionLabel?: string         e.g., "Undo"
 *  - onAction?: () => void
 *  - onDismiss: () => void
 *  - durationMs?: number          default 10000; pass 0 to disable auto-dismiss
 */
export default function Toast({
  open,
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 10000,
}) {
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open || durationMs === 0 || paused) return undefined;
    clearTimer();
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return clearTimer;
  }, [open, durationMs, paused, onDismiss, clearTimer]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        background: '#1e3a5f',
        border: '1px solid rgba(96,165,250,0.4)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: tokens.shadow.overlay,
        fontFamily: FF,
        animation: 'toast-in 180ms ease-out',
      }}
    >
      <span style={{
        flex: 1,
        fontSize: '13px',
        color: '#e2e8f0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {message}
      </span>

      {actionLabel && onAction && (
        <button
          type="button"
          data-testid="toast-action"
          onClick={() => {
            clearTimer();
            onAction();
          }}
          style={{
            background: '#1d4ed8',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            padding: '8px 14px',
            minHeight: '44px',
            minWidth: '44px',
            cursor: 'pointer',
            fontFamily: FF,
          }}
        >
          {actionLabel}
        </button>
      )}

      <button
        type="button"
        aria-label="Dismiss notification"
        data-testid="toast-dismiss"
        onClick={() => {
          clearTimer();
          onDismiss();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#e2e8f0',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0',
          minHeight: '44px',
          minWidth: '44px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}
