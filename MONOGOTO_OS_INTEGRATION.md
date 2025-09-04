# DealDesk - Monogoto OS Integration Issue

## Problem Summary
Users authenticated through Monogoto OS cannot access DealDesk because the required database entries are missing in the Supabase database.

## Current Situation
- **DealDesk is deployed and running** at: https://deal-desk.netlify.app
- **SSO redirect is working** from Monogoto OS to DealDesk
- **Authentication fails** because DealDesk can't find the necessary permission entries

## Technical Issue
When a user is redirected from Monogoto OS to DealDesk, the application checks for permissions but fails with a 406 error because:

1. The `applications` table doesn't have a 'dealdesk' entry
2. The `user_app_roles` table doesn't have permission entries for DealDesk users
3. The code was initially looking for a non-existent `user_profiles` table (now fixed)

## What Needs to Be Done

### 1. Add DealDesk to Applications Table
Run this SQL in Supabase:
```sql
INSERT INTO applications (name, description, url, icon, created_at)
VALUES (
  'dealdesk',
  'DealDesk - Operator Pricing Analysis Platform',
  'https://deal-desk.netlify.app',
  '💰',
  NOW()
);
```

### 2. Grant User Permissions
For each user who should have access to DealDesk:
```sql
-- First, get the DealDesk app ID
SELECT id FROM applications WHERE name = 'dealdesk';

-- Then grant access (example for an admin user)
INSERT INTO user_app_roles (user_id, app_id, role, created_at)
VALUES (
  '[USER_UUID]',      -- The user's UUID from auth.users
  '[DEALDESK_APP_ID]', -- The ID from above query
  'admin',            -- Can be 'user', 'admin', or 'sales_admin'
  NOW()
);
```

### 3. Available Roles
- `user` - Basic access (can see costs, export data)
- `admin` - Full access (can edit pricing, manage users)
- `sales_admin` - Same as admin (legacy compatibility)

## How DealDesk Permission Check Works

When a user accesses DealDesk:
1. Checks if user has an active Supabase session
2. Queries `applications` table for the DealDesk app ID
3. Checks `user_app_roles` for the user's role in DealDesk
4. If no explicit DealDesk role but user has ANY Monogoto OS role, grants basic 'user' access
5. Returns appropriate permissions based on role

## Testing After Setup

1. User logs into Monogoto OS
2. User clicks on DealDesk tile/link
3. User is redirected to https://deal-desk.netlify.app
4. DealDesk should now load with appropriate permissions

## SQL Script Provided
See `setup-dealdesk-permissions.sql` for a complete setup script with examples.

## Contact
If issues persist after running the setup script, check:
- The Supabase logs for any SQL errors
- The browser console when accessing DealDesk for detailed error messages
- That the user's session token is being properly passed from Monogoto OS