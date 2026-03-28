'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setSupabaseTokenGetter, getSupabaseClient } from '@/lib/supabase/client';

/**
 * Call this hook once at the top of your component tree (e.g. ChatDashboard).
 * It registers the Clerk token getter so all Supabase requests get a fresh JWT.
 * Returns the stable singleton Supabase client.
 */
export function useSupabase() {
  const { getToken } = useAuth();
  const client = getSupabaseClient();

  useEffect(() => {
    // 1. Set token getter for all HTTP fetch requests and WebSocket realtime
    setSupabaseTokenGetter(() => getToken({ template: 'supabase' }));

    // 2. Aggressively push the token to Realtime to fix the React mount race-condition
    const syncRealtime = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (token) client.realtime.setAuth(token);
      } catch (err) {}
    };
    syncRealtime();
    
  }, [getToken, client]);

  return client;
}
