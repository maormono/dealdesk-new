-- Setup authentication on the EXISTING Supabase instance
-- This will work alongside your pricing tables

-- Create allowed users table (won't conflict with pricing tables)
CREATE TABLE IF NOT EXISTS public.allowed_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Insert the two allowed emails
INSERT INTO public.allowed_users (email) VALUES
    ('israel@monogoto.io'),
    ('maor@monogoto.io')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Create policy for reading allowed users (anyone can check)
CREATE POLICY "Anyone can view allowed users" ON public.allowed_users
    FOR SELECT USING (true);

-- Create a function to check if user is allowed
CREATE OR REPLACE FUNCTION public.check_user_allowed()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email ends with @monogoto.io
    IF NOT (NEW.email LIKE '%@monogoto.io') THEN
        RAISE EXCEPTION 'Only @monogoto.io email addresses are allowed';
    END IF;
    
    -- Check if email is in allowed list
    IF NOT EXISTS (
        SELECT 1 FROM public.allowed_users 
        WHERE LOWER(email) = LOWER(NEW.email)
    ) THEN
        RAISE EXCEPTION 'Your email is not in the allowed users list. Please contact israel@monogoto.io for access.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to check on signup
DROP TRIGGER IF EXISTS check_user_allowed_trigger ON auth.users;
CREATE TRIGGER check_user_allowed_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_allowed();

-- Create a function to add new allowed users (admin only)
CREATE OR REPLACE FUNCTION public.add_allowed_user(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    -- Check if caller is an admin (israel@monogoto.io or maor@monogoto.io)
    IF auth.email() NOT IN ('israel@monogoto.io', 'maor@monogoto.io') THEN
        RAISE EXCEPTION 'Only admins can add new allowed users';
    END IF;
    
    -- Check if email is from monogoto.io domain
    IF NOT (user_email LIKE '%@monogoto.io') THEN
        RAISE EXCEPTION 'Only @monogoto.io email addresses can be added';
    END IF;
    
    -- Add the user
    INSERT INTO public.allowed_users (email, created_by)
    VALUES (LOWER(user_email), auth.uid())
    ON CONFLICT (email) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_allowed_user TO authenticated;
GRANT SELECT ON public.allowed_users TO authenticated;

-- Check what we have
SELECT 'Setup complete!' as status;
SELECT * FROM public.allowed_users;