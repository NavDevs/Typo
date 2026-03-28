-- 0015_friends_realtime.sql
-- Enable Realtime for the friends table so that accepting a friend request
-- triggers an instant UI update on both sender and receiver clients.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'friends'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;
    END IF;
END $$;

COMMIT;
