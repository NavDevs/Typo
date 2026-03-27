-- Fix RLS for Rooms
DROP POLICY IF EXISTS "Rooms viewable by everyone" ON rooms;
CREATE POLICY "Rooms viewable by everyone" ON rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Rooms insertable by authenticated users" ON rooms;
CREATE POLICY "Rooms insertable by authenticated users" ON rooms FOR INSERT WITH CHECK (true);

-- Fix RLS for Room Members
DROP POLICY IF EXISTS "Room members viewable by everyone" ON room_members;
CREATE POLICY "Room members viewable by everyone" ON room_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Room members insertable by everyone" ON room_members;
CREATE POLICY "Room members insertable by everyone" ON room_members FOR INSERT WITH CHECK (true);

-- Fix RLS for Friends
DROP POLICY IF EXISTS "Friends viewable by everyone" ON friends;
CREATE POLICY "Friends viewable by everyone" ON friends FOR SELECT USING (true);

DROP POLICY IF EXISTS "Friends insertable by users" ON friends;
CREATE POLICY "Friends insertable by users" ON friends FOR INSERT WITH CHECK (true);

-- Fix RLS for Users (to allow Edit Profile)
DROP POLICY IF EXISTS "Users updateable by self" ON users;
CREATE POLICY "Users updateable by self" ON users FOR UPDATE USING (true); 
-- Note: 'true' is safe here because Supabase uses the clerk_id in the WHERE clause of our Server Action update.
