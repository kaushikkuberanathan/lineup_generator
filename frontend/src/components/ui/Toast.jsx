import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Top-anchored transient notification.
 * Sits below safe-area inset, above page content.
 * Auto-dismisses unless hovered/focused. Supports an optional action button + dismiss.
 *
 * Props:
 *  - open: boolean
 *  - message: string
 *  - actionLabel?: string         e.g., "Undo"
 *  - onAction?: () => void
 *  - onDismiss: () => void
 *  - durationMs?: number          default 10000; pass 0 to disable auto-dismiss
 *  - tone?: 'info' | 'success' | 'warning'  default 'info'
 */
export default function Toast({
  open,
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 10000,
  tone = 'info',
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

  const toneClass = {
    info: 'bg-slate-800 border-slate-700 text-white',
    success: 'bg-emerald-700 border-emerald-600 text-white',
    warning: 'bg-amber-600 border-amber-500 text-white',
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="fixed left-0 right-0 z-50 flex justify-center px-3 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      <div
        className={`pointer-events-auto w-full max-w-md flex items-center gap-2 rounded-lg border shadow-lg px-3 py-2 animate-toast-in ${toneClass}`}
      >
        <span className="flex-1 text-sm font-medium truncate">{message}</span>

        {actionLabel && onAction && (
          <button
            type="button"
            data-testid="toast-action"
            onClick={() => {
              clearTimer();
              onAction();
            }}
            className="min-h-[44px] min-w-[44px] px-3 rounded-md bg-white/15 hover:bg-white/25 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-white/15 text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
