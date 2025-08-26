-- Open authentication to ANY @monogoto.io email address
-- This removes the whitelist requirement and only checks domain

-- Drop the existing trigger that checks the allowed_users list
DROP TRIGGER IF EXISTS check_user_allowed_trigger ON auth.users;

-- Create a simpler function that only checks domain
CREATE OR REPLACE FUNCTION public.check_monogoto_domain()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if email ends with @monogoto.io
    IF NOT (NEW.email LIKE '%@monogoto.io') THEN
        RAISE EXCEPTION 'Only @monogoto.io email addresses are allowed to sign up';
    END IF;
    
    -- Allow any @monogoto.io email
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger with domain-only check
CREATE TRIGGER check_monogoto_domain_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_monogoto_domain();

-- Optional: Keep the allowed_users table for reference/history but it will not block signups
-- You can drop it if you do not need it anymore:
-- DROP TABLE IF EXISTS public.allowed_users CASCADE;

-- Verify the change
SELECT 'Authentication is now open to all @monogoto.io emails!' as status;