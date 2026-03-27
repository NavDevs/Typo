-- Phase 6: Emoji Reactions & Reply Threads

-- 1. Add reply_to_id to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- 2. Add reply_to_id to direct_messages table
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- 3. Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('room', 'dm')),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- 4. Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for reactions
CREATE POLICY "Anyone can view reactions" ON public.message_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
  FOR DELETE USING (true);

-- 6. Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
