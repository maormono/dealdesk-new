-- Fix User Management RLS and Functions
-- Run this to fix the "Failed to load users" error

-- 1. First check if you are properly set as admin
SELECT 
    u.email,
    up.role,
    up.user_id,
    'Is Admin: ' || CASE WHEN up.role = 'admin' THEN 'YES' ELSE 'NO' END as admin_status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid());

-- 2. Temporarily disable RLS to fix the issue
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Drop and recreate the get_all_users_admin function with better error handling
DROP FUNCTION IF EXISTS public.get_all_users_admin();

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in TIMESTAMP WITH TIME ZONE,
    role TEXT,
    can_see_costs BOOLEAN,
    can_edit_pricing BOOLEAN,
    can_export_data BOOLEAN,
    markup_percentage DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_email TEXT;
    current_user_role TEXT;
BEGIN
    -- Get current user's email and role
    SELECT 
        au.email,
        up.role 
    INTO 
        current_user_email,
        current_user_role
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.user_id
    WHERE au.id = auth.uid();
    
    -- Log for debugging
    RAISE NOTICE 'Current user: %, Role: %', current_user_email, current_user_role;
    
    -- Check if current user is admin
    -- For now, also check hardcoded list as fallback
    IF current_user_role != 'admin' AND current_user_email NOT IN (
        'maor@monogoto.io',
        'israel@monogoto.io',
        'asaf@monogoto.io',
        'itamar@monogoto.io'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required. Current user: %, Role: %', current_user_email, current_user_role;
    END IF;

    -- Return all users
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::TEXT,
        u.created_at,
        u.last_sign_in_at as last_sign_in,
        COALESCE(up.role, 'viewer')::TEXT as role,
        COALESCE(up.can_see_costs, FALSE) as can_see_costs,
        COALESCE(up.can_edit_pricing, FALSE) as can_edit_pricing,
        COALESCE(up.can_export_data, TRUE) as can_export_data,
        COALESCE(up.markup_percentage, 50.0) as markup_percentage
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
END;
$$;

-- 4. Similarly fix the get_user_statistics function
DROP FUNCTION IF EXISTS public.get_user_statistics();

CREATE OR REPLACE FUNCTION public.get_user_statistics()
RETURNS TABLE (
    total_users BIGINT,
    admin_count BIGINT,
    sales_count BIGINT,
    viewer_count BIGINT,
    users_last_7_days BIGINT,
    users_last_30_days BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_email TEXT;
    current_user_role TEXT;
BEGIN
    -- Get current user's email and role
    SELECT 
        au.email,
        up.role 
    INTO 
        current_user_email,
        current_user_role
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.user_id
    WHERE au.id = auth.uid();
    
    -- Check if current user is admin (with fallback)
    IF current_user_role != 'admin' AND current_user_email NOT IN (
        'maor@monogoto.io',
        'israel@monogoto.io',
        'asaf@monogoto.io',
        'itamar@monogoto.io'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id)::BIGINT as total_users,
        COUNT(DISTINCT CASE WHEN up.role = 'admin' THEN u.id END)::BIGINT as admin_count,
        COUNT(DISTINCT CASE WHEN up.role = 'sales' THEN u.id END)::BIGINT as sales_count,
        COUNT(DISTINCT CASE WHEN up.role = 'viewer' OR up.role IS NULL THEN u.id END)::BIGINT as viewer_count,
        COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '7 days' THEN u.id END)::BIGINT as users_last_7_days,
        COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN u.id END)::BIGINT as users_last_30_days
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON u.id = up.user_id
    WHERE u.email LIKE '%@monogoto.io';
END;
$$;

-- 5. Re-enable RLS with fixed policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role bypass" ON public.user_profiles;

-- Create a bypass policy for service role (used by functions)
CREATE POLICY "Service role bypass" ON public.user_profiles
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
        OR
        -- Fallback for hardcoded admins
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid() 
            AND au.email IN (
                'maor@monogoto.io',
                'israel@monogoto.io',
                'asaf@monogoto.io',
                'itamar@monogoto.io'
            )
        )
    );

-- Admins can manage all profiles
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
        OR
        -- Fallback for hardcoded admins
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid() 
            AND au.email IN (
                'maor@monogoto.io',
                'israel@monogoto.io',
                'asaf@monogoto.io',
                'itamar@monogoto.io'
            )
        )
    );

-- 6. Grant proper permissions
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_statistics() TO authenticated;

-- 7. Test the functions
-- This should work now
SELECT * FROM public.get_all_users_admin();
SELECT * FROM public.get_user_statistics();

-- 8. Show current status
SELECT 
    'Setup Complete' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'sales' THEN 1 END) as sales
FROM public.user_profiles;