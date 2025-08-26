-- Complete fix for RLS recursion issue
-- This script removes ALL policies and disables RLS temporarily

-- Step 1: Drop ALL existing policies on user_profiles
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Disable RLS entirely for now
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Ensure the table has all required columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS can_see_costs BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_export_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 4: Update the existing profile for the current admin user
UPDATE user_profiles SET
    email = 'maor@monogoto.io',
    role = 'admin',
    can_see_costs = true,
    can_edit_pricing = true,
    can_export_data = true,
    markup_percentage = 50,
    updated_at = NOW()
WHERE 
    user_id = '2ef0c569-7c8c-4255-a936-2b29fa58a203' OR
    id = '2ef0c569-7c8c-4255-a936-2b29fa58a203';

-- If no rows were updated, insert a new one
INSERT INTO user_profiles (
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
    '2ef0c569-7c8c-4255-a936-2b29fa58a203',
    'maor@monogoto.io',
    'admin',
    true,
    true,
    true,
    50,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = '2ef0c569-7c8c-4255-a936-2b29fa58a203' 
    OR id = '2ef0c569-7c8c-4255-a936-2b29fa58a203'
);

-- Step 5: Verify the data
SELECT * FROM user_profiles;

-- Note: RLS is now DISABLED. This means all authenticated users can access all profiles.
-- This is a temporary fix. Once the application is working, you can re-enable RLS with proper policies.