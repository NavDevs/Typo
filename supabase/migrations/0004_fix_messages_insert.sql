-- Ensure users can insert messages
DROP POLICY IF EXISTS "Messages insertable by everyone" ON messages;
CREATE POLICY "Messages insertable by everyone" ON messages FOR INSERT WITH CHECK (true);
