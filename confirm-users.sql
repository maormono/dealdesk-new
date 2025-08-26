-- Run this in Supabase SQL Editor to manually confirm users
-- This is a workaround if email confirmation is not working

-- Manually confirm specific users
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email IN ('maor@monogoto.io', 'israel@monogoto.io');

-- Verify the users are confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users 
WHERE email IN ('maor@monogoto.io', 'israel@monogoto.io');

-- Alternative: Update all @monogoto.io users
-- UPDATE auth.users 
-- SET 
--   email_confirmed_at = NOW(),
--   confirmed_at = NOW()
-- WHERE email LIKE '%@monogoto.io' AND email_confirmed_at IS NULL;