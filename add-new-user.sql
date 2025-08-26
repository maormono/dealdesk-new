-- Add a new allowed user to the system
-- Run this as israel@monogoto.io or maor@monogoto.io

-- Option 1: Use the function (if you're logged in as admin)
SELECT public.add_allowed_user('newuser@monogoto.io');

-- Option 2: Direct insert (if running as database admin)
-- Replace 'newuser@monogoto.io' with the actual email
INSERT INTO public.allowed_users (email) 
VALUES ('newuser@monogoto.io')
ON CONFLICT (email) DO NOTHING;

-- Verify the user was added
SELECT * FROM public.allowed_users;