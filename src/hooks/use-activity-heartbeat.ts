'use client';

import { useEffect, useRef } from 'react';
import { hasAuthToken } from '@/lib/auth/cookies';

/**
 * Tracks real user activity (mouse, keyboard, touch, tab focus) and sends a
 * throttled heartbeat to /api/auth/activity. The IdP uses the heartbeat to
 * update `session.last_user_activity`, which is the clock the idle-timeout
 * check reads on token refresh — so background auto-refresh alone CANNOT
 * keep a session alive: the user has to be actually using the page.
 *
 * Throttling: at most one heartbeat per `MIN_INTERVAL_MS` per visit. The
 * server further throttles to ~30s.
 */

const MIN_INTERVAL_MS = 60_000;

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'wheel',
] as const;

export function useActivityHeartbeat() {
  const lastSentRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function sendHeartbeat() {
      if (cancelled) return;
      if (!hasAuthToken()) return;
      if (inFlightRef.current) return;

      const now = Date.now();
      if (now - lastSentRef.current < MIN_INTERVAL_MS) return;

      lastSentRef.current = now;
      inFlightRef.current = true;
      try {
        await fetch('/api/auth/activity', {
          method: 'POST',
          credentials: 'include',
          // No body — the proxy reads the token from the cookie.
          keepalive: true,
        });
      } catch {
        // Heartbeats are non-critical; swallow errors.
      } finally {
        inFlightRef.current = false;
      }
    }

    function handleActivity() {
      // Schedule, don't await — we don't want to block input handlers.
      void sendHeartbeat();
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat();
      }
    }

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, handleActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
