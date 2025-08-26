-- Update Supabase Auth Configuration for DealDesk
-- Run this in Supabase SQL Editor to fix the invitation flow

-- IMPORTANT: The correct site URL is https://deal-desk.netlify.app (NOT dealdesk-monogoto)

-- 1. Update Site URL
UPDATE auth.config 
SET value = 'https://deal-desk.netlify.app'
WHERE key = 'site_url';

-- 2. Update URI Allow List (redirect URLs)
UPDATE auth.config
SET value = jsonb_build_array(
    'https://deal-desk.netlify.app',
    'https://deal-desk.netlify.app/',
    'https://deal-desk.netlify.app/*',
    'https://deal-desk.netlify.app/auth/callback',
    'https://deal-desk.netlify.app/auth/confirm',
    'http://localhost:5173',
    'http://localhost:5173/',
    'http://localhost:5173/*',
    'http://localhost:5173/auth/callback'
)::text
WHERE key = 'uri_allow_list';

-- 3. Verify the changes were applied
SELECT 
    key,
    value,
    'Updated' as status
FROM auth.config 
WHERE key IN ('site_url', 'uri_allow_list');

-- 4. Check current email template settings
SELECT 
    'Check Email Templates' as action,
    'Go to Authentication → Email Templates and update all templates' as instruction,
    'Use https://deal-desk.netlify.app/auth/callback in all template URLs' as url_format;