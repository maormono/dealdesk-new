-- Create a function to get all users (admin only)
-- This function allows admins to see user emails from auth.users table

CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return user data from auth.users
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_users_admin() IS 'Returns all users from auth.users table. Requires admin role.';