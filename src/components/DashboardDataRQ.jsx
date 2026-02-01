/* eslint-disable */
import React from 'react';

const ENABLED = (import.meta.env.VITE_REACT_QUERY_ENABLED || 'false').toLowerCase() === 'true';

export default function DashboardDataRQ({ apiService, onData, logger }) {
  if (!ENABLED) return null;
  return <AsyncRQ apiService={apiService} onData={onData} logger={logger} />;
}

function AsyncRQ({ apiService, onData, logger }) {
  const [mods, setMods] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pkg = '@tanstack/react-query';
        const mod = await import(/* @vite-ignore */ pkg);
        if (!cancelled) setMods({ useQuery: mod.useQuery });
      } catch (e) {
        if (!cancelled) setMods(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!mods) return null;
  return <DataRQImpl useQuery={mods.useQuery} apiService={apiService} onData={onData} logger={logger} />;
}

function DataRQImpl({ useQuery, apiService, onData, logger }) {
  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiService.getCurrentUser(),
    staleTime: 60_000,
    retry: 1,
  });

  const activeBookingQuery = useQuery({
    queryKey: ['activeBookings'],
    queryFn: () => apiService.request('/booking/user/active'),
    enabled: !!(userQuery.data && userQuery.data.success),
    staleTime: 30_000,
    retry: 1,
  });

  React.useEffect(() => {
    if (userQuery.data) {
      const payload = {
        user: userQuery.data.user || null,
        activeBookings: activeBookingQuery.data?.data || [],
      };
      try { onData?.(payload); } catch (e) { logger?.warn?.('onData callback failed', e); }
    }
  }, [userQuery.data, activeBookingQuery.data]);

  return null;
}
