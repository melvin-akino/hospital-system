/**
 * useIdleTimer.ts
 *
 * Tracks user inactivity and fires callbacks when the idle threshold is reached.
 * - onWarn  — fires `warnBefore` ms before timeout (show modal)
 * - onLogout — fires when the timeout expires (force logout)
 */

import { useEffect, useRef, useCallback } from 'react';

interface IdleTimerOptions {
  /** Total idle time (ms) before logout. Default: 30 minutes */
  timeout?: number;
  /** How many ms before timeout to fire `onWarn`. Default: 2 minutes */
  warnBefore?: number;
  onWarn: () => void;
  onLogout: () => void;
  /** If false, timer is not started (e.g. user not logged in) */
  enabled?: boolean;
}

const EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel',
];

export function useIdleTimer({
  timeout    = 30 * 60 * 1000,   // 30 min
  warnBefore = 2  * 60 * 1000,   // warn 2 min before
  onWarn,
  onLogout,
  enabled = true,
}: IdleTimerOptions) {
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned      = useRef(false);

  const clearTimers = useCallback(() => {
    if (warnTimer.current)   clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    warned.current = false;

    warnTimer.current = setTimeout(() => {
      warned.current = true;
      onWarn();
    }, timeout - warnBefore);

    logoutTimer.current = setTimeout(() => {
      onLogout();
    }, timeout);
  }, [enabled, timeout, warnBefore, onWarn, onLogout, clearTimers]);

  // Called externally when the user clicks "Stay logged in" in the modal
  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) return;

    resetTimers();
    EVENTS.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));

    return () => {
      clearTimers();
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimers));
    };
  }, [enabled, resetTimers, clearTimers]);

  return { extendSession };
}
