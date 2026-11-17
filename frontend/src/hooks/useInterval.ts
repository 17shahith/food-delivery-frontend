import { useEffect, useRef } from 'react';

/** Calls `fn` every `ms` while `ms` is a number; pass null to pause. Skips while the tab is hidden. */
export function useInterval(fn: () => void, ms: number | null): void {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') saved.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
