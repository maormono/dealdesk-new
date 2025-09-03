-- Create a test sales user for DealDesk
-- This script adds a sales user to test the role-based pricing functionality

-- 1. First, check if the user already exists
SELECT id, email, role, can_see_costs, markup_percentage 
FROM public.user_profiles 
WHERE email = 'sales.test@monogoto.io';

-- 2. Add a new sales test user if they don't exist
-- Note: The user needs to sign up first through the application
-- Then run this to update their role to sales

-- Update an existing user to sales role (after they sign up)
UPDATE public.user_profiles
SET 
    role = 'sales',
    can_see_costs = FALSE,
    can_edit_pricing = FALSE,
    markup_percentage = 50.0,  -- 50% markup = 1.5x multiplier
    updated_at = NOW()
WHERE email = 'sales.test@monogoto.io';

-- Or if you want to test with an existing user temporarily:
-- UPDATE public.user_profiles
-- SET 
--     role = 'sales',
--     can_see_costs = FALSE,
--     can_edit_pricing = FALSE,
--     markup_percentage = 50.0,
--     updated_at = NOW()
-- WHERE email = 'YOUR_TEST_EMAIL@monogoto.io';

-- 3. Verify the update
SELECT 
    email,
    role,
    can_see_costs,
    can_edit_pricing,
    markup_percentage,
    updated_at
FROM public.user_profiles
WHERE role = 'sales'
ORDER BY updated_at DESC;

-- 4. To revert a user back to admin:
-- UPDATE public.user_profiles
-- SET 
--     role = 'admin',
--     can_see_costs = TRUE,
--     can_edit_pricing = TRUE,
--     markup_percentage = 0,
--     updated_at = NOW()
-- WHERE email = 'YOUR_EMAIL@monogoto.io';