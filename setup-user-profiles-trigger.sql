-- Setup automatic user profile creation for future users

-- Step 1: Create a function that creates a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.user_profiles (
    user_id,
    email,
    role,
    can_see_costs,
    can_edit_pricing,
    can_export_data,
    markup_percentage,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'viewer', -- Default role for new users
    false,    -- Default: cannot see costs
    false,    -- Default: cannot edit pricing
    false,    -- Default: cannot export data
    50,       -- Default markup percentage
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Step 2: Create a trigger that fires when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Handle existing users who don't have profiles yet
INSERT INTO public.user_profiles (
  user_id,
  email,
  role,
  can_see_costs,
  can_edit_pricing,
  can_export_data,
  markup_percentage,
  created_at
)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
    THEN 'admin'
    ELSE 'viewer'
  END as role,
  CASE 
    WHEN au.email IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
    THEN true
    ELSE false
  END as can_see_costs,
  CASE 
    WHEN au.email IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
    THEN true
    ELSE false
  END as can_edit_pricing,
  CASE 
    WHEN au.email IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
    THEN true
    ELSE false
  END as can_export_data,
  50 as markup_percentage,
  au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE up.user_id IS NULL;

-- Step 4: Create RPC function to safely update user roles (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id UUID,
  new_role TEXT,
  new_can_see_costs BOOLEAN DEFAULT false,
  new_can_edit_pricing BOOLEAN DEFAULT false,
  new_can_export_data BOOLEAN DEFAULT false,
  new_markup_percentage NUMERIC DEFAULT 50
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT auth.jwt() ->> 'email' INTO current_user_email;
  
  -- Check if current user is admin
  IF current_user_email NOT IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') THEN
    -- Also check if they have admin role in the database
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can update user roles';
    END IF;
  END IF;
  
  -- Update the user's role
  UPDATE user_profiles SET
    role = new_role,
    can_see_costs = new_can_see_costs,
    can_edit_pricing = new_can_edit_pricing,
    can_export_data = new_can_export_data,
    markup_percentage = new_markup_percentage,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Step 5: Create RPC function to delete a user (admin only)
CREATE OR REPLACE FUNCTION delete_user_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT auth.jwt() ->> 'email' INTO current_user_email;
  
  -- Check if current user is admin
  IF current_user_email NOT IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can delete users';
    END IF;
  END IF;
  
  -- Delete the user profile
  DELETE FROM user_profiles WHERE user_id = target_user_id;
  
  -- Note: This doesn't delete from auth.users - that requires different approach
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_profile TO authenticated;

-- Step 6: Verify everything is set up
SELECT 
  'Users without profiles:' as check_type,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON up.user_id = au.id
WHERE up.user_id IS NULL

UNION ALL

SELECT 
  'Total user profiles:' as check_type,
  COUNT(*) as count
FROM user_profiles

UNION ALL

SELECT 
  'Admin users:' as check_type,
  COUNT(*) as count
FROM user_profiles
WHERE role = 'admin';