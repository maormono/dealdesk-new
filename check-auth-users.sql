-- Check authentication setup for DealDesk
-- Since auth.config doesn't exist, we'll check users and create helper functions

-- 1. Check all @monogoto.io users and their status
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Needs Email Confirmation'
        ELSE 'Ready to Login'
    END as status
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC;

-- 2. Check if the domain trigger is active
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled
FROM pg_trigger 
WHERE tgname LIKE '%monogoto%' OR tgname LIKE '%domain%';

-- 3. Manually confirm a user's email if needed (for testing)
-- Uncomment and update the email to confirm a specific user
/*
UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'asaf@monogoto.io';
*/

-- 4. Create a function to resend invite with correct URL
-- This creates a password reset link that works like an invite
CREATE OR REPLACE FUNCTION generate_invite_link(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reset_token text;
    site_url text := 'https://dealdesk-monogoto.netlify.app';
BEGIN
    -- Generate a password reset token (works like invite)
    UPDATE auth.users
    SET 
        confirmation_token = encode(gen_random_bytes(32), 'hex'),
        confirmation_sent_at = now()
    WHERE email = user_email
    RETURNING confirmation_token INTO reset_token;
    
    -- Return the invite URL
    RETURN site_url || '/auth/confirm?token=' || reset_token || '&type=invite';
END;
$$;

-- 5. Show current user status with helpful info
SELECT 
    email,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 
            'User needs to confirm email. Check their inbox or resend invite from Supabase Dashboard.'
        WHEN last_sign_in_at IS NULL THEN 
            'User confirmed but never logged in. They should use "Sign In" with their password.'
        ELSE 
            'User is active and has logged in before. They can sign in normally.'
    END as next_action
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC;