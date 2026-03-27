-- Phase 8: Message Search

-- 1. Enable the pg_trgm extension FIRST (required for gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add GIN trigram indexes for fast ILIKE queries
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
ON public.messages USING gin (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_dm_content_trgm
ON public.direct_messages USING gin (content gin_trgm_ops);
