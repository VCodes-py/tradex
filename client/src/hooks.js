import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs `fn` now and every `ms` (paused while the tab is hidden). Keeps old data while refreshing. */
export function usePolling(fn, ms, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false, updatedAt: new Date() });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(() => !document.hidden && run(), ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, run, ...deps]);

  return { ...state, refresh: run };
}

export function useLocalList(key) {
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  });
  const toggle = (item) =>
    setList((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  return [list, toggle];
}
