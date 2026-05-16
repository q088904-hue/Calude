/**
 * Shared hooks — MeenTrack V2
 */

import { useEffect, useRef } from "react";

/**
 * Calls `callback` when the Escape key is pressed.
 *
 * Uses the "latest-ref" pattern: `callback` is stored in a ref so the
 * document listener is only re-registered when `active` changes, not on
 * every render if the caller passes an inline arrow function.
 *
 * @param callback - Function to call on Escape.
 * @param active   - Set to false to disable the listener (e.g. when the
 *                   dialog is hidden). Defaults to true.
 */
export function useEscapeKey(callback: () => void, active = true): void {
  const savedCallback = useRef(callback);

  // Keep the ref up to date without re-registering the listener.
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") savedCallback.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active]);
}
