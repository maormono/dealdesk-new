-- Fix Supabase Authentication URLs for Email Confirmations
-- Run this in Supabase SQL Editor

-- 1. First, check current auth settings
SELECT 
    id,
    site_url,
    uri_allow_list,
    created_at,
    updated_at
FROM auth.flow_state
LIMIT 1;

-- 2. Update auth configuration using Supabase dashboard settings
-- Go to: Authentication > URL Configuration
-- Set the following:

-- Site URL: https://dealdesk-monogoto.netlify.app
-- Redirect URLs (add all of these):
-- https://dealdesk-monogoto.netlify.app
-- https://dealdesk-monogoto.netlify.app/*
-- https://dealdesk-monogoto.netlify.app/auth/callback
-- https://dealdesk-monogoto.netlify.app/auth/confirm

-- 3. If you need to update email templates, go to:
-- Authentication > Email Templates
-- Make sure the confirmation URL uses: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email

-- 4. For immediate fix, update the redirect URL in your invite function
-- This query shows current auth users and their confirmation status
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_app_meta_data->>'provider' as provider,
    raw_user_meta_data->>'invited' as invited
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC;

-- 5. To manually confirm a user (if needed for testing)
-- Replace the email with the actual user email
/*
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'newuser@monogoto.io' 
AND email_confirmed_at IS NULL;
*/