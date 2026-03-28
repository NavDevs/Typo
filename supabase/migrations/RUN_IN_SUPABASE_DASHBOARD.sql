-- ============================================
-- FIX RLS ONCE AND FOR ALL FOR FRIEND REQUESTS 
-- AND NOTIFICATIONS
-- ============================================

-- Since the dev environment uses the 0005_ultimate_rls_bypass.sql 
-- pattern for other tables, we will apply the same open policy 
-- to friend_requests and notifications so the database stops 
-- blocking operations invisibly.

-- Enable RLS just in case it isn't
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting restrictive policies
DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can insert friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can update their received friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can delete own friend requests" ON public.friend_requests;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Create ALL bypass policies using the exact format from 0005
CREATE POLICY "Allow All" ON public.friend_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure realtime is enabled one last time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;
