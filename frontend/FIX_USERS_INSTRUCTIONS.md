# Fix User Management Display

The users are not showing in the admin panel because the RPC functions in the database don't match what the UserManagement component expects.

## Quick Fix Steps:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your DealDesk project
3. Go to the SQL Editor (in the left sidebar)
4. Copy and paste the contents of `fix-user-management-rpc.sql` file
5. Click "Run" to execute the SQL

This will:
- Update the `get_all_users_admin()` function to return the correct fields
- Create the `get_user_statistics()` function if it doesn't exist
- Properly join auth.users with user_profiles table
- Handle both `user_id` and `id` fields for compatibility

After running the SQL, refresh your admin panel and the users should appear.

## Alternative: Direct SQL

If you can't find the file, here's the key function that needs to be created:

```sql
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
  -- Check admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE (user_id = auth.uid() OR id = auth.uid())
    AND role = 'admin'
  ) THEN
    IF auth.jwt() ->> 'email' NOT IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') THEN
      RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
  END IF;

  -- Return user data
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

GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
```