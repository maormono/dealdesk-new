-- Add asaf@monogoto.io to allowed users
-- Run this in Supabase SQL Editor as israel@monogoto.io or maor@monogoto.io

-- Method 1: Using the admin function (if logged in as admin)
SELECT public.add_allowed_user('asaf@monogoto.io');

-- Method 2: Direct insert (if you have database admin access)
INSERT INTO public.allowed_users (email) 
VALUES ('asaf@monogoto.io')
ON CONFLICT (email) DO NOTHING;

-- Verify the user was added
SELECT * FROM public.allowed_users
ORDER BY created_at DESC;