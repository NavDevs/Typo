-- Phase 7: Edit & Delete Messages

-- 1. Add edited_at timestamp to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add deleted_at timestamp to messages (soft delete)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Add edited_at timestamp to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Add deleted_at timestamp to direct_messages (soft delete)
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
