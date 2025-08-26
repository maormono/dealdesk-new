-- Fix infinite recursion in user_profiles RLS policies
-- The issue is that the RLS policy is checking the user_profiles table while querying it

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Temporarily disable RLS to fix the issue
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Create simplified non-recursive policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.uid() = id OR
        auth.jwt() ->> 'email' IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io')
    );

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        auth.uid() = id OR
        auth.jwt() ->> 'email' IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io')
    );

-- Policy 3: Admins can insert new profiles
CREATE POLICY "Admins can insert profiles" ON user_profiles
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io')
    );

-- Policy 4: Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON user_profiles
    FOR DELETE
    USING (
        auth.jwt() ->> 'email' IN ('maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io')
    );

-- Make sure the table has proper columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS can_see_costs BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_export_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update email field from auth.users if missing
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE (up.user_id = au.id OR up.id = au.id)
AND up.email IS NULL;