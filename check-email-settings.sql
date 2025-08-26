-- Check Supabase Email Settings and Templates
-- Run this in Supabase SQL Editor to debug the email issue

-- 1. Check if SMTP is configured (this might be the issue)
SELECT 
    'SMTP Configuration' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_settings WHERE name LIKE '%smtp%')
        THEN 'SMTP settings found'
        ELSE 'No SMTP configuration - using default Supabase email'
    END as status;

-- 2. Check recent auth logs for errors
SELECT 
    created_at,
    path,
    method,
    status_code,
    error_msg
FROM auth.audit_log_entries
WHERE 
    created_at > NOW() - INTERVAL '1 hour'
    AND (path LIKE '%recover%' OR path LIKE '%reset%' OR error_msg IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;

-- 3. Test if we can manually trigger a password reset
-- This will show what the actual error is
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'maor@monogoto.io'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found user: %', test_user_id;
        -- Try to create a recovery token
        -- Note: This won't actually work but will show us the error
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;

-- 4. Check if email templates are properly configured
SELECT 
    'Email Template Check' as check_type,
    'Go to Authentication > Email Templates' as action,
    'Ensure Reset Password template uses: {{ .SiteURL }}/auth/callback' as requirement;