-- Set a password for existing users in Supabase
-- Run this in the Supabase SQL Editor

-- First, confirm the user (if not already confirmed)
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'maor@monogoto.io' AND email_confirmed_at IS NULL;

-- To set a password, you need to use Supabase Dashboard or Auth API
-- You cannot directly set passwords via SQL for security reasons

-- Instead, you can:
-- 1. Use "Send password recovery" from the Supabase Dashboard
-- 2. Or delete and recreate the user with a password
-- 3. Or use the Supabase Management API

-- Check user status
SELECT 
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at
FROM auth.users 
WHERE email = 'maor@monogoto.io';