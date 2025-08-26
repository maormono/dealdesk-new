-- Check and Update Admin Roles for DealDesk
-- Run this in Supabase SQL Editor to ensure admin users are properly configured

-- 1. First, check current user profiles
SELECT 
    u.email,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing,
    up.can_export_data,
    up.created_at,
    up.updated_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email LIKE '%@monogoto.io'
ORDER BY u.email;

-- 2. Check if user_profiles table exists and has data
SELECT COUNT(*) as profile_count FROM public.user_profiles;

-- 3. Ensure admin users have profiles with correct permissions
-- This will create or update profiles for admin users
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
    u.id,
    u.email,
    'admin',
    TRUE,
    TRUE,
    TRUE,
    0
FROM auth.users u
WHERE u.email IN (
    'maor@monogoto.io',
    'israel@monogoto.io',
    'asaf@monogoto.io',
    'itamar@monogoto.io'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin',
    can_see_costs = TRUE,
    can_edit_pricing = TRUE,
    can_export_data = TRUE,
    markup_percentage = 0,
    updated_at = NOW();

-- 4. Test the get_user_role_info function for your user
-- Replace the email below with your actual email
SELECT * FROM public.get_user_role_info(
    (SELECT id FROM auth.users WHERE email = 'maor@monogoto.io')
);

-- 5. Verify all admin users are set correctly
SELECT 
    u.email,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing,
    'Profile exists: ' || CASE WHEN up.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email IN (
    'maor@monogoto.io',
    'israel@monogoto.io',
    'asaf@monogoto.io',
    'itamar@monogoto.io'
)
ORDER BY u.email;

-- 6. If the function doesn't exist, check if it needs to be created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_role_info';