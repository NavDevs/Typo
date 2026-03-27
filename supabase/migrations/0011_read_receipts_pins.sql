-- Phase 9: Read Receipts & Pinned Messages

-- 1. Create room_pins table for tracking pinned messages in rooms
CREATE TABLE IF NOT EXISTS public.room_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    pinned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(room_id, message_id)
);

-- 2. Add RLS for room_pins
ALTER TABLE public.room_pins ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read pins
DROP POLICY IF EXISTS "Allow all to read pins" ON public.room_pins;
CREATE POLICY "Allow all to read pins" ON public.room_pins
    FOR SELECT TO authenticated USING (true);

-- Allow room creator or admin to pin/unpin 
-- (For now using a simplified policy that allows any authenticated user to pin, 
-- but we can restrict this to room owners if we have an owner_id in the rooms table)
DROP POLICY IF EXISTS "Allow authenticated to manage pins" ON public.room_pins;
CREATE POLICY "Allow authenticated to manage pins" ON public.room_pins
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Ensure direct_messages has read_at (it should already from initial schema)
-- No changes needed if it exists, but making sure it's indexable for performance
CREATE INDEX IF NOT EXISTS idx_dm_read_at ON public.direct_messages(read_at) WHERE read_at IS NULL;
