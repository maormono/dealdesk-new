-- Update Supabase Auth Settings to Fix Email Confirmation URLs
-- Run this in Supabase SQL Editor

-- 1. Check current auth configuration
SELECT * FROM auth.config WHERE key IN ('site_url', 'uri_allow_list', 'external_url');

-- 2. Update the site URL (this is what Supabase uses as base for ConfirmationURL)
UPDATE auth.config 
SET value = 'https://dealdesk-monogoto.netlify.app' 
WHERE key = 'site_url';

-- 3. Update the allowed redirect URLs
-- This ensures Supabase accepts callbacks to your app
UPDATE auth.config
SET value = jsonb_build_array(
    'https://dealdesk-monogoto.netlify.app',
    'https://dealdesk-monogoto.netlify.app/',
    'https://dealdesk-monogoto.netlify.app/*',
    'https://dealdesk-monogoto.netlify.app/auth/callback',
    'https://dealdesk-monogoto.netlify.app/auth/confirm',
    'http://localhost:5173',
    'http://localhost:5173/',
    'http://localhost:5173/*',
    'http://localhost:5173/auth/callback',
    'http://localhost:5173/auth/confirm'
)::text
WHERE key = 'uri_allow_list';

-- 4. Verify the changes
SELECT * FROM auth.config WHERE key IN ('site_url', 'uri_allow_list');

-- Note: If the above doesn't work, you need to update these settings in the Supabase Dashboard:
-- Go to: Authentication > URL Configuration
-- Set Site URL to: https://dealdesk-monogoto.netlify.app
-- Add all the redirect URLs listed above