-- Manually Confirm User and Set Role
-- Run this in Supabase SQL Editor to bypass email confirmation

-- 1. Find the user that needs confirmation
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '⚠️ Needs Confirmation'
        ELSE '✅ Confirmed'
    END as status
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Manually confirm the user (replace with actual email)
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'newuser@monogoto.io'  -- REPLACE WITH ACTUAL EMAIL
AND email_confirmed_at IS NULL;

-- 3. Create user profile with appropriate role
INSERT INTO public.user_profiles (
    user_id,
    email,
    role,
    can_see_costs,
    can_edit_pricing,
    can_export_data,
    markup_percentage
)
SELECT 
    id,
    email,
    'sales',  -- Change to 'admin' if they should be admin
    FALSE,    -- Set to TRUE for admin
    FALSE,    -- Set to TRUE for admin
    TRUE,
    50.0      -- Set to 0 for admin
FROM auth.users
WHERE email = 'newuser@monogoto.io'  -- REPLACE WITH ACTUAL EMAIL
ON CONFLICT (user_id) 
DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- 4. Verify the user is set up correctly
SELECT 
    u.email,
    u.email_confirmed_at,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email = 'newuser@monogoto.io';  -- REPLACE WITH ACTUAL EMAIL