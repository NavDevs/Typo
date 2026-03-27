-- ONLY RUN THIS TO FIX THE RECURSION ERROR:
DROP POLICY IF EXISTS "Room members viewable by members" ON room_members;
CREATE POLICY "Room members viewable by everyone" ON room_members FOR SELECT USING (true);
