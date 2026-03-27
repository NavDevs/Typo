-- Migration: Add Image Upload Support
-- Description: Adds image_url column to chat tables and creates the 'chat-images' Storage bucket.

-- 1. Add image_url to messages tables
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create the 'chat-images' Storage bucket
-- This requires the storage schema which Supabase provides by default
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 3. Storage RLS Policies
-- IMPORTANT: storage.objects is owned by supabase_storage_admin,
-- so we CANNOT create policies via SQL Editor.
-- Instead, configure these via the Supabase Dashboard:
--   Storage → chat-images → Policies:
--     - SELECT: Allow access for ALL users (public read)
--     - INSERT: Allow access for AUTHENTICATED users only
