-- Phase 11: Friend Requests
-- Required to allow users to send and accept friend requests instead of instant friendship.

CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT friend_requests_no_self_request CHECK (sender_id != receiver_id)
);

-- Ensure a user can only have one active request per pair (ignore order)
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_unique_pair 
ON public.friend_requests (
    LEAST(sender_id, receiver_id), 
    GREATEST(sender_id, receiver_id)
) WHERE status = 'pending';

-- RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() IN (
    SELECT clerk_id FROM public.users WHERE id = sender_id OR id = receiver_id
));

-- Handled via Server Actions (service role bypasses RLS for insertion/updates)
