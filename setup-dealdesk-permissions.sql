-- Setup script for DealDesk permissions in Monogoto OS database
-- Run this in your Supabase SQL editor

-- 1. Create the DealDesk application entry
INSERT INTO applications (name, description, url, icon, created_at)
VALUES (
  'dealdesk',
  'DealDesk - Operator Pricing Analysis Platform',
  'https://deal-desk.netlify.app',
  '💰', -- You can update this with a proper icon URL later
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- 2. Get the DealDesk application ID for reference
-- Run this query to get the app_id you'll need for user permissions:
SELECT id, name FROM applications WHERE name = 'dealdesk';

-- 3. Grant access to specific users (replace with actual user IDs and app_id)
-- Example for granting admin access:
/*
INSERT INTO user_app_roles (user_id, app_id, role, created_at)
VALUES (
  'USER_UUID_HERE', -- Replace with actual user UUID
  'DEALDESK_APP_ID_HERE', -- Replace with DealDesk app ID from step 2
  'admin', -- Can be 'user', 'admin', or 'sales_admin'
  NOW()
);
*/

-- 4. Example: Grant access to maor+1@monogoto.io (you'll need their user ID)
-- First, find the user:
SELECT id, email FROM auth.users WHERE email = 'maor+1@monogoto.io';

-- Then grant them access (uncomment and fill in the IDs):
/*
INSERT INTO user_app_roles (user_id, app_id, role, created_at)
VALUES (
  'MAOR_USER_ID', -- From the query above
  'DEALDESK_APP_ID', -- From step 2
  'admin',
  NOW()
);
*/

-- 5. Optional: Grant basic 'user' access to all existing Monogoto OS users
-- This query will add DealDesk access for all users who already have any app access
/*
INSERT INTO user_app_roles (user_id, app_id, role, created_at)
SELECT DISTINCT 
  uar.user_id,
  (SELECT id FROM applications WHERE name = 'dealdesk'),
  'user',
  NOW()
FROM user_app_roles uar
WHERE NOT EXISTS (
  SELECT 1 FROM user_app_roles 
  WHERE user_id = uar.user_id 
  AND app_id = (SELECT id FROM applications WHERE name = 'dealdesk')
);
*/

-- 6. Verify the setup
-- Check that DealDesk exists in applications:
SELECT * FROM applications WHERE name = 'dealdesk';

-- Check user permissions for DealDesk:
SELECT 
  u.email,
  uar.role,
  uar.created_at
FROM user_app_roles uar
JOIN auth.users u ON u.id = uar.user_id
WHERE uar.app_id = (SELECT id FROM applications WHERE name = 'dealdesk')
ORDER BY uar.created_at DESC;