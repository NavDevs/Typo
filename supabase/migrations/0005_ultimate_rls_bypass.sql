-- FULL PERMISSIVE RLS BYPASS
-- This script grants complete read/write access to all authenticated users for all tables.
-- Run this if you are encountering persistent database permission errors during frontend development.

DROP POLICY IF EXISTS "Allow All" ON users;
CREATE POLICY "Allow All" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON rooms;
CREATE POLICY "Allow All" ON rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON room_members;
CREATE POLICY "Allow All" ON room_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON friends;
CREATE POLICY "Allow All" ON friends FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON messages;
CREATE POLICY "Allow All" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
