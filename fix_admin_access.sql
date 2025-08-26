-- Run this in Supabase SQL Editor to enable admin access
-- Replace 'your-email@example.com' with your actual email address

-- First, check if user_profiles table exists and what users we have
SELECT id, email FROM auth.users;

-- Check current user profiles
SELECT * FROM user_profiles;

-- Update your user to have admin role
-- IMPORTANT: Replace the email below with YOUR actual email
UPDATE user_profiles 
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'maor@monogoto.io'  -- CHANGE THIS TO YOUR EMAIL
);

-- If the above doesn't work because user_profiles doesn't have your user, insert it:
INSERT INTO user_profiles (id, role, created_at, updated_at)
SELECT 
  id, 
  'admin' as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users 
WHERE email = 'maor@monogoto.io'  -- CHANGE THIS TO YOUR EMAIL
ON CONFLICT (id) 
DO UPDATE SET role = 'admin', updated_at = NOW();

-- Verify the update
SELECT u.email, up.role 
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'maor@monogoto.io';  -- CHANGE THIS TO YOUR EMAIL