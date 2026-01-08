-- Add can_see_hidden_networks column to user_profiles table
-- Run this in Supabase SQL Editor

-- 1. Add the new column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS can_see_hidden_networks BOOLEAN DEFAULT FALSE;

-- 2. Update existing admin users to have can_see_hidden_networks = TRUE
UPDATE public.user_profiles
SET can_see_hidden_networks = TRUE
WHERE role = 'admin';

-- 3. Update existing sales/viewer users to have can_see_hidden_networks = FALSE
UPDATE public.user_profiles
SET can_see_hidden_networks = FALSE
WHERE role IN ('sales', 'viewer');

-- 4. Update the get_user_role_info function to include the new column
CREATE OR REPLACE FUNCTION public.get_user_role_info(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    role TEXT,
    can_see_costs BOOLEAN,
    can_see_hidden_networks BOOLEAN,
    can_edit_pricing BOOLEAN,
    can_export_data BOOLEAN,
    markup_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.role,
        up.can_see_costs,
        up.can_see_hidden_networks,
        up.can_edit_pricing,
        up.can_export_data,
        up.markup_percentage
    FROM public.user_profiles up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the get_all_users_admin function to include the new column
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in TIMESTAMP WITH TIME ZONE,
    role TEXT,
    can_see_costs BOOLEAN,
    can_see_hidden_networks BOOLEAN,
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
        COALESCE(up.can_see_hidden_networks, FALSE) as can_see_hidden_networks,
        COALESCE(up.can_edit_pricing, FALSE) as can_edit_pricing,
        COALESCE(up.can_export_data, FALSE) as can_export_data,
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
$$ LANGUAGE plpgsql;

-- 6. Update the update_user_role function to set permissions based on role
-- Admin: costs=TRUE, hidden_networks=TRUE, export=TRUE, markup=0
-- Sales: costs=FALSE, hidden_networks=FALSE, export=TRUE, markup=configurable (default 50)
-- Viewer: costs=FALSE, hidden_networks=FALSE, export=FALSE, markup=50
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

    -- Update or insert user profile with role-based permissions
    -- Admin: costs=TRUE, hidden_networks=TRUE, export=TRUE, markup=0
    -- Sales: costs=FALSE, hidden_networks=FALSE, export=TRUE, markup=configurable
    -- Viewer: costs=FALSE, hidden_networks=FALSE, export=FALSE, markup=50
    INSERT INTO public.user_profiles (
        user_id,
        email,
        role,
        can_see_costs,
        can_see_hidden_networks,
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
        CASE WHEN new_role = 'admin' THEN TRUE ELSE FALSE END,
        CASE WHEN new_role IN ('admin', 'sales') THEN TRUE ELSE FALSE END,
        CASE
            WHEN new_role = 'admin' THEN 0
            WHEN new_role = 'sales' THEN new_markup
            ELSE 50.0
        END,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        can_see_costs = EXCLUDED.can_see_costs,
        can_see_hidden_networks = EXCLUDED.can_see_hidden_networks,
        can_edit_pricing = EXCLUDED.can_edit_pricing,
        can_export_data = EXCLUDED.can_export_data,
        markup_percentage = EXCLUDED.markup_percentage,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Update the deactivate_user function to include the new column
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

    -- Update user profile to viewer role (effectively disabling access)
    UPDATE public.user_profiles
    SET
        role = 'viewer',
        can_see_costs = FALSE,
        can_see_hidden_networks = FALSE,
        can_edit_pricing = FALSE,
        can_export_data = FALSE,
        markup_percentage = 50.0,
        updated_at = NOW()
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Verify the setup
SELECT
    email,
    role,
    can_see_costs,
    can_see_hidden_networks,
    can_export_data,
    markup_percentage
FROM public.user_profiles
ORDER BY
    CASE
        WHEN role = 'admin' THEN 1
        WHEN role = 'sales' THEN 2
        ELSE 3
    END,
    email;
