-- Check if current users have admin roles set up
SELECT 
    u.email,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing,
    CASE 
        WHEN up.role = 'admin' THEN '✅ Can invite users'
        ELSE '❌ Cannot invite users'
    END as invite_permission
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email LIKE '%@monogoto.io'
ORDER BY 
    CASE 
        WHEN up.role = 'admin' THEN 1
        WHEN up.role = 'sales' THEN 2
        ELSE 3
    END,
    u.email;