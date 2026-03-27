-- Phase 10: Notifications & User Preferences

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'dm', 'mention', 'system', 'friend_request'
    content TEXT NOT NULL,
    link TEXT, -- URL or internal route to navigate to
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Add preferences and push_subscription to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
    "accent": "indigo",
    "density": "comfortable",
    "notifications_enabled": true,
    "notify_dms": true,
    "notify_mentions": true,
    "notify_sounds": true,
    "show_online_status": "everyone",
    "show_read_receipts": true,
    "show_avatars": true
}'::JSONB;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- 3. Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read/manage their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid()::text IN (SELECT clerk_id FROM users WHERE id = user_id));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid()::text IN (SELECT clerk_id FROM users WHERE id = user_id));

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);

-- 5. Trigger for Direct Message Notifications
CREATE OR REPLACE FUNCTION public.handle_dm_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, content, link)
    VALUES (
        NEW.receiver_id,
        'dm',
        'New message received',
        '/chat'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_dm_created ON public.direct_messages;
CREATE TRIGGER on_dm_created
    AFTER INSERT ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_dm_notification();

-- 6. Trigger for Room @Mentions
CREATE OR REPLACE FUNCTION public.handle_room_mention()
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user_id UUID;
BEGIN
    -- Detect @mentions
    IF NEW.content ~ '@[a-zA-Z0-9_]+' THEN
        -- Simplified username extraction and lookup
        SELECT id INTO mentioned_user_id 
        FROM public.users 
        WHERE NEW.content ILIKE '%@' || username || '%'
        AND id != NEW.sender_id
        LIMIT 1;

        IF mentioned_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, content, link)
            VALUES (
                mentioned_user_id,
                'mention',
                'You were mentioned in a room',
                '/chat'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_room_message_created ON public.messages;
CREATE TRIGGER on_room_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_room_mention();

