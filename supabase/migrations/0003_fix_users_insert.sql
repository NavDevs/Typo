-- Allow users to insert their own profile during the initial sync when they load the chat dashboard
DROP POLICY IF EXISTS "Users insertable by everyone" ON users;
CREATE POLICY "Users insertable by everyone" ON users FOR INSERT WITH CHECK (true);
