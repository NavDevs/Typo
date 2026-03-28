import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mutable reference to the token getter — updated by useSupabase hook
let _getToken: (() => Promise<string | null>) | null = null;

let _client: SupabaseClient | null = null;

export function setSupabaseTokenGetter(getter: () => Promise<string | null>) {
  _getToken = getter;
}

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const headers = new Headers(options?.headers);
          if (_getToken) {
            const token = await _getToken();
            if (token) headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(url, { ...options, headers, cache: 'no-store' });
        },
      },
      // THIS CAUSES WEBSOCKET/REALTIME CLIENT TO INJECT JWT
      accessToken: async () => {
        return _getToken ? await _getToken() : null;
      }
    }
  );

  return _client;
}

