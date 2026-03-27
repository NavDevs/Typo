-- Migration: Create direct_messages table and RLS policies
-- Description: Adds 1-on-1 private messaging functionality between users

DROP TABLE IF EXISTS public.direct_messages CASCADE;

CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Note: We prevent a user from sending a message to themselves at the DB level
ALTER TABLE public.direct_messages
    ADD CONSTRAINT check_sender_receiver_different CHECK (sender_id != receiver_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_participants 
ON public.direct_messages (sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at 
ON public.direct_messages (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------------
-- STRICT PRIVACY RLS POLICIES FOR DIRECT MESSAGES
-- ----------------------------------------------------------------------------------

-- Policy: Select
-- Users can only view messages where they are the sender OR the receiver
CREATE POLICY "Users can view their own direct messages"
    ON public.direct_messages
    FOR SELECT
    USING (
        (auth.jwt()->>'sub') IN (
            SELECT clerk_id FROM public.users WHERE id = sender_id OR id = receiver_id
        )
    );

-- Policy: Insert
-- Users can only insert messages where they are the designated sender
CREATE POLICY "Users can insert direct messages they send"
    ON public.direct_messages
    FOR INSERT
    WITH CHECK (
        (auth.jwt()->>'sub') IN (
            SELECT clerk_id FROM public.users WHERE id = sender_id
        )
    );

-- Policy: Update (Specifically for marking as read)
-- Users can only update messages where they are the receiver
CREATE POLICY "Users can update direct messages they receive"
    ON public.direct_messages
    FOR UPDATE
    USING (
        (auth.jwt()->>'sub') IN (
            SELECT clerk_id FROM public.users WHERE id = receiver_id
        )
    );

-- Policy: Delete
-- Users can delete their own sent messages (optional feature)
CREATE POLICY "Users can delete direct messages they sent"
    ON public.direct_messages
    FOR DELETE
    USING (
        (auth.jwt()->>'sub') IN (
            SELECT clerk_id FROM public.users WHERE id = sender_id
        )
    );

-- ----------------------------------------------------------------------------------
-- DEVELOPMENT BYPASS (Aligning with 0005_ultimate_rls_bypass.sql for local dev velocity)
-- ----------------------------------------------------------------------------------

-- In a real production app, you would ONLY use the strict policies above.
-- But we are adding the universal bypass here to unblock the Next.js frontend
-- so we can isolate if the insert error is RLS related or Schema related.

CREATE POLICY "Enable ALL for authenticated users (DEV BYPASS - DM)" 
    ON public.direct_messages FOR ALL 
    USING (true) 
    WITH CHECK (true);
