# Supabase Invite Configuration Guide

## Problem
When inviting users through Supabase Dashboard, the invitation emails redirect to localhost instead of the production URL.

## Solution

### 1. Update Environment Variables
Add the following to your `.env` file in the frontend:
```
VITE_SITE_URL=https://dealdesk-monogoto.netlify.app
```

### 2. Configure Supabase Dashboard Settings

Go to your Supabase Dashboard and update these settings:

#### A. Authentication Settings
1. Go to **Authentication** → **URL Configuration**
2. Update the following URLs:
   - **Site URL**: `https://dealdesk-monogoto.netlify.app`
   - **Redirect URLs** (add all of these):
     - `https://dealdesk-monogoto.netlify.app`
     - `https://dealdesk-monogoto.netlify.app/*`
     - `https://dealdesk-monogoto.netlify.app/auth/callback`

#### B. Email Templates
1. Go to **Authentication** → **Email Templates**
2. For the **Invite User** template, ensure the action URL uses:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
   ```

#### C. Project Settings
1. Go to **Settings** → **Project Settings**
2. Under **General**, verify the project URL is correct

### 3. SQL Configuration (Optional)
If you need to update auth settings via SQL:

```sql
-- Check current auth configuration
SELECT * FROM auth.config WHERE key IN ('site_url', 'redirect_url', 'external_url');

-- Update site URL (if needed)
UPDATE auth.config 
SET value = 'https://dealdesk-monogoto.netlify.app' 
WHERE key = 'site_url';
```

### 4. Inviting New Users

After configuration, when you invite users:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Invite User**
3. Enter the user's email (must be @monogoto.io)
4. The user will receive an email with a link to set their password
5. The link will redirect to `https://dealdesk-monogoto.netlify.app` instead of localhost

### 5. Testing

To test the configuration:
1. Invite a test user with a @monogoto.io email
2. Check the invitation email
3. Verify the link points to the production URL
4. Confirm the user can set their password and log in

## Important Notes

- Always use @monogoto.io email addresses (domain restriction is active)
- Users need to click the invite link within 24 hours
- After setting password, users can log in normally
- The VITE_SITE_URL must match the URL configured in Supabase Dashboard