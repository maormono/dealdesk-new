# Supabase Authentication Setup for DealDesk

## Quick Fix for Invite Redirect Issue

Since `auth.config` table doesn't exist in your Supabase version, you need to configure the redirect URLs through the Supabase Dashboard.

### Step 1: Update Supabase Dashboard Settings

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/uddmjjgnexdazfedrytt)

2. Navigate to **Authentication** → **URL Configuration**

3. Update these settings:
   - **Site URL**: `https://dealdesk-monogoto.netlify.app`
   - **Redirect URLs** (add all of these, one per line):
     ```
     https://dealdesk-monogoto.netlify.app
     https://dealdesk-monogoto.netlify.app/*
     https://dealdesk-monogoto.netlify.app/auth/callback
     https://dealdesk-monogoto.netlify.app/auth/confirm
     ```

4. Click **Save**

### Step 2: Update Email Templates

1. Still in the Dashboard, go to **Authentication** → **Email Templates**

2. Click on **Invite User** template

3. Make sure the **Confirm signup** URL uses:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/
   ```

4. For **Reset Password** template, ensure it uses:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/
   ```

5. Click **Save** for each template

### Step 3: Environment Variables (Already Done)

The `.env` file has been created with:
```
VITE_SITE_URL=https://dealdesk-monogoto.netlify.app
```

### Step 4: Deploy to Netlify

Make sure to add the environment variable in Netlify:

1. Go to Netlify Dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add:
   - Key: `VITE_SITE_URL`
   - Value: `https://dealdesk-monogoto.netlify.app`

### How to Invite New Users

After configuration:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Invite User**
3. Enter email (must be @monogoto.io)
4. User receives email with link to `https://dealdesk-monogoto.netlify.app` (not localhost)
5. User sets password and can log in

### Troubleshooting

If users still get redirected to localhost:

1. **Clear browser cache** - Old redirects might be cached
2. **Check email template** - Make sure it uses `{{ .SiteURL }}` not hardcoded URLs
3. **Verify Site URL** - In Dashboard, ensure Site URL is set to production URL
4. **Check user status** - Run `check-auth-users.sql` to see if user needs email confirmation

### Testing a User

Run this SQL in Supabase SQL Editor to check user status:
```sql
SELECT 
    email,
    email_confirmed_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Needs to confirm email'
        WHEN last_sign_in_at IS NULL THEN 'Ready to sign in'
        ELSE 'Active user'
    END as status
FROM auth.users
WHERE email = 'asaf@monogoto.io';
```

If the user needs to confirm their email, they should check their inbox for the confirmation link.