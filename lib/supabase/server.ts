import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const createClerkServerClient = async () => {
  const { getToken } = await auth();
  
  // Get the token using the custom 'supabase' jwt template
  let clerkToken: string | null = null;
  try {
    clerkToken = await getToken({ template: 'supabase' });
  } catch (e) {
    console.error("Clerk auth failed inside Server Action", e);
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    }
  );
};
