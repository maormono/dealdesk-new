-- Make sure israel@monogoto.io has admin role
-- First, let's see the current status
SELECT 'Current Status' as check_type, u.email, up.role, up.user_id
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email = 'israel@monogoto.io';

-- Ensure israel@monogoto.io has admin role
INSERT INTO public.user_profiles (
    user_id, 
    email, 
    role, 
    can_see_costs, 
    can_edit_pricing, 
    can_export_data,
    markup_percentage,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.email,
    'admin',
    TRUE,
    TRUE,
    TRUE,
    0,
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'israel@monogoto.io'
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    can_see_costs = TRUE,
    can_edit_pricing = TRUE,
    can_export_data = TRUE,
    markup_percentage = 0,
    updated_at = NOW();

-- Verify the fix
SELECT 'After Fix' as check_type, u.email, up.role, 
       CASE WHEN up.role = 'admin' THEN '✅ Can invite users' ELSE '❌ Cannot invite' END as status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email = 'israel@monogoto.io';