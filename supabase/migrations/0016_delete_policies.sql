-- 0016_delete_policies.sql
-- Add DELETE RLS policies for unfriend, leave room, and notification cleanup

BEGIN;

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE TO authenticated 
    USING (auth.uid()::text IN (SELECT clerk_id FROM users WHERE id = user_id));

-- Allow users to delete friendships they are part of
DROP POLICY IF EXISTS "Users can delete own friendships" ON public.friends;
CREATE POLICY "Users can delete own friendships" ON public.friends
    FOR DELETE TO authenticated 
    USING (
        auth.uid()::text IN (
            SELECT clerk_id FROM users WHERE id = user_id_1 OR id = user_id_2
        )
    );

-- Allow users to delete friend requests they are involved in
DROP POLICY IF EXISTS "Users can delete own friend requests" ON public.friend_requests;
CREATE POLICY "Users can delete own friend requests" ON public.friend_requests
    FOR DELETE TO authenticated 
    USING (
        auth.uid()::text IN (
            SELECT clerk_id FROM users WHERE id = sender_id OR id = receiver_id
        )
    );

-- Allow users to remove themselves from rooms
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users can leave rooms" ON public.room_members
    FOR DELETE TO authenticated 
    USING (
        auth.uid()::text IN (SELECT clerk_id FROM users WHERE id = user_id)
    );

COMMIT;
