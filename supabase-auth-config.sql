-- Supabase Authentication Configuration for DealDesk
-- Run this in the Supabase SQL Editor to configure redirect URLs

-- 1. Check current auth configuration
SELECT 
    key,
    value,
    updated_at
FROM auth.config 
WHERE key IN ('site_url', 'redirect_urls', 'external_url', 'uri_allow_list')
ORDER BY key;

-- 2. Update the site URL to production
-- This is the base URL that Supabase will use for redirects
UPDATE auth.config 
SET value = 'https://dealdesk-monogoto.netlify.app' 
WHERE key = 'site_url';

-- 3. Set allowed redirect URLs
-- These are the URLs that Supabase will accept as valid redirect destinations
UPDATE auth.config
SET value = jsonb_build_array(
    'https://dealdesk-monogoto.netlify.app',
    'https://dealdesk-monogoto.netlify.app/*',
    'https://dealdesk-monogoto.netlify.app/auth/callback',
    'https://dealdesk-monogoto.netlify.app/auth/confirm'
)::text
WHERE key = 'uri_allow_list';

-- 4. If the above doesn't work, try this alternative approach
-- Some Supabase versions use different config structure
INSERT INTO auth.config (key, value)
VALUES ('redirect_urls', 'https://dealdesk-monogoto.netlify.app,https://dealdesk-monogoto.netlify.app/*')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 5. Verify the configuration was applied
SELECT 
    'Configuration Updated' as status,
    key,
    value
FROM auth.config 
WHERE key IN ('site_url', 'redirect_urls', 'uri_allow_list')
ORDER BY key;

-- 6. Check if any users need email confirmation
-- This will show users who haven't confirmed their email yet
SELECT 
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Pending Confirmation'
        ELSE 'Confirmed'
    END as status
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC;

-- 7. Optional: If you need to manually confirm a user's email (admin only)
-- Uncomment and update the email address as needed
/*
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'user@monogoto.io' 
AND email_confirmed_at IS NULL;
*/