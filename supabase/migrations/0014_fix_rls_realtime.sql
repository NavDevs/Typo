-- 0014_fix_rls_realtime.sql
-- Enable Realtime for rooms, room_members, and friend_requests

BEGIN;

-- Add publications for realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
    END IF;
END $$;

-- Fix RLS for friend_requests
DROP POLICY IF EXISTS "Users can insert friend requests" ON public.friend_requests;
CREATE POLICY "Users can insert friend requests" 
ON public.friend_requests FOR INSERT 
WITH CHECK (
    auth.uid()::text IN (SELECT clerk_id FROM public.users WHERE id = sender_id)
);

DROP POLICY IF EXISTS "Users can update their received friend requests" ON public.friend_requests;
CREATE POLICY "Users can update their received friend requests" 
ON public.friend_requests FOR UPDATE 
USING (
    auth.uid()::text IN (SELECT clerk_id FROM public.users WHERE id = receiver_id)
);

-- Fix RLS for friends insertion (accepting requests)
DROP POLICY IF EXISTS "Users can insert friends" ON public.friends;
CREATE POLICY "Users can insert friends" 
ON public.friends FOR INSERT 
WITH CHECK (
    auth.uid()::text IN (SELECT clerk_id FROM public.users WHERE id = user_id_1 OR id = user_id_2)
);

COMMIT;
