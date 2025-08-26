-- Check current authentication setup and fix if needed

-- 1. First, check if the user already exists
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'asaf@monogoto.io';

-- 2. Check what triggers are currently active
SELECT 
    tgname as trigger_name,
    tgtype,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- 3. Check if allowed_users table exists and what's in it
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_users'
) as table_exists;

-- If table exists, show the allowed users
SELECT * FROM public.allowed_users 
WHERE email LIKE '%@monogoto.io'
ORDER BY email;

-- 4. If the domain trigger already exists, we just need to ensure the user can sign up
-- The user should be able to sign up directly since the domain check is in place
-- They just need to use the "Sign Up" option first if they haven't created an account yet

-- 5. Optional: Manually create the user (only if you have admin access)
-- Uncomment and run this if you want to manually create the user:
/*
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    gen_random_uuid(),
    'asaf@monogoto.io',
    crypt('TempPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    'authenticated'
) ON CONFLICT (email) DO NOTHING;
*/

-- 6. Show current status
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'asaf@monogoto.io') 
        THEN 'User exists - they should be able to sign in'
        ELSE 'User does not exist - they need to sign up first'
    END as status,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_monogoto_domain_trigger')
        THEN 'Domain check is active - any @monogoto.io email can sign up'
        ELSE 'Domain check not found - may need to set up authentication rules'
    END as auth_status;