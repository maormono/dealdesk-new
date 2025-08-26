-- Create User Profiles Table and Functions for DealDesk
-- Run this FIRST to set up the user roles system

-- 1. Create user_profiles table to store user roles and preferences
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'viewer')),
    markup_percentage DECIMAL(5,2) DEFAULT 50.0, -- Default 50% markup for sales (1.5x)
    can_see_costs BOOLEAN DEFAULT FALSE,
    can_edit_pricing BOOLEAN DEFAULT FALSE,
    can_export_data BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 2. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;

-- 4. Create RLS policies for user_profiles
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert/update/delete profiles
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Create function to get user's role and permissions
CREATE OR REPLACE FUNCTION public.get_user_role_info(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    role TEXT,
    can_see_costs BOOLEAN,
    can_edit_pricing BOOLEAN,
    can_export_data BOOLEAN,
    markup_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.role,
        up.can_see_costs,
        up.can_edit_pricing,
        up.can_export_data,
        up.markup_percentage
    FROM public.user_profiles up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get all users (admin only)
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
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.created_at,
        u.last_sign_in_at as last_sign_in,
        COALESCE(up.role, 'viewer') as role,
        COALESCE(up.can_see_costs, FALSE) as can_see_costs,
        COALESCE(up.can_edit_pricing, FALSE) as can_edit_pricing,
        COALESCE(up.can_export_data, TRUE) as can_export_data,
        COALESCE(up.markup_percentage, 50.0) as markup_percentage
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON u.id = up.user_id
    WHERE u.email LIKE '%@monogoto.io'  -- Only show Monogoto users
    ORDER BY 
        CASE 
            WHEN up.role = 'admin' THEN 1
            WHEN up.role = 'sales' THEN 2
            ELSE 3
        END,
        u.email;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id UUID,
    new_role TEXT,
    new_markup DECIMAL(5,2) DEFAULT 50.0
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
    target_email TEXT;
    current_user_role TEXT;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    IF current_user_role IS NULL OR current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Validate role
    IF new_role NOT IN ('admin', 'sales', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, sales, or viewer.';
    END IF;

    -- Get target user email
    SELECT email INTO target_email
    FROM auth.users
    WHERE id = target_user_id;

    IF target_email IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    -- Prevent removing the last admin
    IF new_role != 'admin' THEN
        IF (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'admin' AND user_id != target_user_id) = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last admin user.';
        END IF;
    END IF;

    -- Update or insert user profile
    INSERT INTO public.user_profiles (
        user_id,
        email,
        role,
        can_see_costs,
        can_edit_pricing,
        can_export_data,
        markup_percentage,
        updated_at
    ) VALUES (
        target_user_id,
        target_email,
        new_role,
        CASE WHEN new_role = 'admin' THEN TRUE ELSE FALSE END,
        CASE WHEN new_role = 'admin' THEN TRUE ELSE FALSE END,
        TRUE,
        CASE WHEN new_role = 'sales' THEN new_markup ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        can_see_costs = EXCLUDED.can_see_costs,
        can_edit_pricing = EXCLUDED.can_edit_pricing,
        markup_percentage = EXCLUDED.markup_percentage,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get user statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_user_statistics()
RETURNS TABLE (
    total_users BIGINT,
    admin_count BIGINT,
    sales_count BIGINT,
    viewer_count BIGINT,
    users_last_7_days BIGINT,
    users_last_30_days BIGINT
)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN up.role = 'admin' THEN u.id END) as admin_count,
        COUNT(DISTINCT CASE WHEN up.role = 'sales' THEN u.id END) as sales_count,
        COUNT(DISTINCT CASE WHEN up.role = 'viewer' OR up.role IS NULL THEN u.id END) as viewer_count,
        COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '7 days' THEN u.id END) as users_last_7_days,
        COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN u.id END) as users_last_30_days
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON u.id = up.user_id
    WHERE u.email LIKE '%@monogoto.io';
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to deactivate a user (admin only)
CREATE OR REPLACE FUNCTION public.deactivate_user(
    target_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
    target_user_role TEXT;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    IF current_user_role IS NULL OR current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Get target user role
    SELECT role INTO target_user_role
    FROM public.user_profiles
    WHERE user_id = target_user_id;

    -- Prevent deactivating the last admin
    IF target_user_role = 'admin' THEN
        IF (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'admin' AND user_id != target_user_id) = 0 THEN
            RAISE EXCEPTION 'Cannot deactivate the last admin user.';
        END IF;
    END IF;

    -- Prevent self-deactivation
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot deactivate your own account.';
    END IF;

    -- Update user profile to viewer role (effectively disabling admin/sales access)
    UPDATE public.user_profiles
    SET 
        role = 'viewer',
        can_see_costs = FALSE,
        can_edit_pricing = FALSE,
        can_export_data = FALSE,
        updated_at = NOW()
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user TO authenticated;

-- 11. Insert initial admin users
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
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    can_see_costs = TRUE,
    can_edit_pricing = TRUE,
    can_export_data = TRUE,
    markup_percentage = 0,
    updated_at = NOW();

-- 12. Insert profiles for other existing users as sales
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
    'sales',
    FALSE,
    FALSE,
    TRUE,
    50.0
FROM auth.users u
WHERE u.email LIKE '%@monogoto.io'
AND u.email NOT IN (
    'maor@monogoto.io',
    'israel@monogoto.io',
    'asaf@monogoto.io',
    'itamar@monogoto.io'
)
ON CONFLICT (user_id) DO NOTHING;

-- 13. Verify the setup
SELECT 
    u.email,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing,
    up.markup_percentage,
    'Setup Complete' as status
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