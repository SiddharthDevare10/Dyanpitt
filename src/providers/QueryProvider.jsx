import { useEffect, useMemo, useRef, useState } from 'react';

// Feature flags (default off)
const ENABLED = (import.meta.env.VITE_REACT_QUERY_ENABLED || 'false').toLowerCase() === 'true';
const ENABLE_DEVTOOLS = (import.meta.env.VITE_REACT_QUERY_DEVTOOLS || 'false').toLowerCase() === 'true';
const IS_DEV = import.meta.env.MODE !== 'production';

/**
 * QueryProvider
 * - Dynamically loads @tanstack/react-query only when enabled
 * - Avoids build errors if dependency isn't installed and flag is off
 * - Adds Devtools when enabled and in development
 */
export default function QueryProvider({ children }) {
  const [rq, setRq] = useState(null); // { QueryClient, QueryClientProvider }
  const [Devtools, setDevtools] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!ENABLED) return;

    let cancelled = false;
    (async () => {
      try {
        const pkg = import.meta.env.VITE_RQ_PKG || '@tanstack/react-query';
        const mod = await import(/* @vite-ignore */ pkg);
        if (cancelled) return;
        setRq({ QueryClient: mod.QueryClient, QueryClientProvider: mod.QueryClientProvider });

        if (IS_DEV && ENABLE_DEVTOOLS) {
          // Devtools are optional; ignore errors if not installed
          try {
            const devPkg = import.meta.env.VITE_RQ_DEVTOOLS_PKG || '@tanstack/react-query-devtools';
            const devtoolsMod = await import(/* @vite-ignore */ devPkg);
            if (!cancelled) setDevtools(() => devtoolsMod.ReactQueryDevtools);
          } catch {
            // ignore if devtools package not present
          }
        }
      } catch (e) {
        // If the package isn't installed but flag is on, fail gracefully to console
        // and render children without provider to avoid total app crash
        console.error('[ReactQuery] Failed to load @tanstack/react-query:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const client = useMemo(() => {
    if (!rq) return null;
    if (!clientRef.current) clientRef.current = new rq.QueryClient();
    return clientRef.current;
  }, [rq]);

  if (!ENABLED || !rq || !client) {
    return children;
  }

  const { QueryClientProvider } = rq;
  const DevtoolsComp = Devtools;

  return (
    <QueryClientProvider client={client}>
      {children}
      {IS_DEV && ENABLE_DEVTOOLS && DevtoolsComp ? <DevtoolsComp /> : null}
    </QueryClientProvider>
  );
}
