-- User Management Functions for DealDesk Admin Panel
-- These functions allow admins to manage user roles through the UI

-- 1. Function to get all users with their profiles (admin only)
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

-- 2. Function to update user role (admin only)
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

-- 3. Function to bulk invite users (admin only)
CREATE OR REPLACE FUNCTION public.invite_users_batch(
    emails TEXT[],
    initial_role TEXT DEFAULT 'sales'
)
RETURNS TABLE (
    email TEXT,
    status TEXT,
    message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    email_item TEXT;
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
    IF initial_role NOT IN ('admin', 'sales', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, sales, or viewer.';
    END IF;

    -- Process each email
    FOREACH email_item IN ARRAY emails
    LOOP
        -- Check if email is valid Monogoto email
        IF email_item NOT LIKE '%@monogoto.io' THEN
            RETURN QUERY SELECT 
                email_item, 
                'error'::TEXT, 
                'Only @monogoto.io emails are allowed'::TEXT;
            CONTINUE;
        END IF;

        -- Check if user already exists
        IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_item) THEN
            RETURN QUERY SELECT 
                email_item, 
                'exists'::TEXT, 
                'User already exists'::TEXT;
        ELSE
            -- Add to allowed users list (if you still have that table)
            -- User will need to sign up through the app to complete registration
            RETURN QUERY SELECT 
                email_item, 
                'pending'::TEXT, 
                'User can now sign up with this email'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get user statistics (admin only)
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

-- 5. Function to delete/deactivate a user (admin only)
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

    -- Note: We don't delete from auth.users as that would require service role
    -- The user is effectively deactivated by setting them to viewer role
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_all_users_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_users_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user TO authenticated;

-- Test the functions (optional)
-- SELECT * FROM public.get_user_statistics();
-- SELECT * FROM public.get_all_users_admin();