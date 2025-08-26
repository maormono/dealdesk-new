-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_all_users_admin();

-- Create the correct function that matches what UserManagement.tsx expects
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in TEXT,
  role TEXT,
  can_see_costs BOOLEAN,
  can_edit_pricing BOOLEAN,
  can_export_data BOOLEAN,
  markup_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user is an admin
  -- Check both user_id and id fields for flexibility
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE (user_id = auth.uid() OR id = auth.uid())
    AND role = 'admin'
  ) THEN
    -- Also check hardcoded admin list
    IF auth.jwt() ->> 'email' NOT IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') THEN
      RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
  END IF;

  -- Return combined data from auth.users and user_profiles
  RETURN QUERY
  SELECT 
    COALESCE(up.user_id, up.id, au.id) as user_id,
    au.email::TEXT,
    au.created_at,
    COALESCE(au.last_sign_in_at::TEXT, 'Never') as last_sign_in,
    COALESCE(up.role, 'viewer')::TEXT as role,
    COALESCE(up.can_see_costs, false) as can_see_costs,
    COALESCE(up.can_edit_pricing, false) as can_edit_pricing,
    COALESCE(up.can_export_data, false) as can_export_data,
    COALESCE(up.markup_percentage, 50.0)::NUMERIC as markup_percentage
  FROM auth.users au
  LEFT JOIN user_profiles up ON (up.user_id = au.id OR up.id = au.id)
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;

-- Also create the user statistics function if it doesn't exist
CREATE OR REPLACE FUNCTION get_user_statistics()
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
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE (user_id = auth.uid() OR id = auth.uid())
    AND role = 'admin'
  ) THEN
    -- Also check hardcoded admin list
    IF auth.jwt() ->> 'email' NOT IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') THEN
      RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(DISTINCT au.id) as total_users,
    COUNT(DISTINCT CASE WHEN up.role = 'admin' THEN au.id END) as admin_count,
    COUNT(DISTINCT CASE WHEN up.role = 'sales' THEN au.id END) as sales_count,
    COUNT(DISTINCT CASE WHEN up.role = 'viewer' OR up.role IS NULL THEN au.id END) as viewer_count,
    COUNT(DISTINCT CASE WHEN au.created_at >= NOW() - INTERVAL '7 days' THEN au.id END) as users_last_7_days,
    COUNT(DISTINCT CASE WHEN au.created_at >= NOW() - INTERVAL '30 days' THEN au.id END) as users_last_30_days
  FROM auth.users au
  LEFT JOIN user_profiles up ON (up.user_id = au.id OR up.id = au.id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_statistics() TO authenticated;