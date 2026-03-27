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

  useEffect(() => {
    setSupabaseTokenGetter(() => getToken({ template: 'supabase' }));
  }, [getToken]);

  return getSupabaseClient();
}
