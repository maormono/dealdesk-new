-- This SQL script creates the authorized users in Supabase
-- Run this in your Supabase SQL Editor

-- Note: You'll need to use the Supabase Dashboard to create these users
-- Go to Authentication > Users > Invite User

-- The users to create:
-- 1. maor@monogoto.io
-- 2. israel@monogoto.io

-- After creating users, you can verify with:
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN ('maor@monogoto.io', 'israel@monogoto.io');

-- Optional: Create a policy to restrict access
-- This ensures only @monogoto.io emails can access data
CREATE POLICY "Only Monogoto domain can access" ON networks
FOR ALL 
TO authenticated
USING (
  auth.jwt() ->> 'email' LIKE '%@monogoto.io'
);