# Debug and Fix Supabase Auth Issue

## The Problem
The confirmation email link is going to a wrong URL that results in "Site not found" on Netlify.

## Quick Fix Steps

### 1. Update Supabase Dashboard Settings

Go to your Supabase Dashboard → Authentication → URL Configuration

**Site URL** (this is critical - it must be EXACTLY):
```
https://dealdesk-monogoto.netlify.app
```

**Redirect URLs** (add ALL of these):
```
https://dealdesk-monogoto.netlify.app
https://dealdesk-monogoto.netlify.app/*
https://dealdesk-monogoto.netlify.app/auth/callback
https://dealdesk-monogoto.netlify.app/auth/confirm
http://localhost:5173
http://localhost:5173/*
http://localhost:5173/auth/callback
```

### 2. Update ALL Email Templates

Go to Authentication → Email Templates and update EACH template:

**Invite User Template:**
```html
<h2>You have been invited</h2>
<p>You have been invited to create a user on DealDesk. Follow this link to accept the invite:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Accept the invite</a></p>
```

**Confirm Signup Template:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email</a></p>
```

**Magic Link Template:**
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Log In</a></p>
```

**Reset Password Template:**
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

### 3. Test with a Direct SQL Query

Run this in Supabase SQL Editor to manually confirm a user if needed:

```sql
-- Check pending users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_app_meta_data,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Needs Confirmation'
        ELSE 'Confirmed'
    END as status
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC;

-- Manually confirm a specific user (replace email)
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'YOUR_USER@monogoto.io' 
AND email_confirmed_at IS NULL;

-- After confirming, create their profile
INSERT INTO public.user_profiles (
    user_id,
    email,
    role,
    can_see_costs,
    can_edit_pricing,
    can_export_data,
    markup_percentage
)
SELECT 
    id,
    email,
    'sales',  -- or 'admin' if they should be admin
    FALSE,
    FALSE,
    TRUE,
    50.0
FROM auth.users
WHERE email = 'YOUR_USER@monogoto.io'
ON CONFLICT (user_id) DO NOTHING;
```

### 4. Alternative: Use Supabase CLI to Check Settings

If you have Supabase CLI installed:

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Check current settings
npx supabase inspect auth

# Update redirect URLs via CLI
npx supabase auth update --site-url "https://dealdesk-monogoto.netlify.app"
```

### 5. Verify the Fix

1. Send a new invitation from User Management
2. Check the email - the link should now be:
   `https://dealdesk-monogoto.netlify.app/auth/callback?token_hash=...&type=invite`
3. Click the link - it should load your app's auth callback page

## If Still Not Working

The issue might be that the `{{ .ConfirmationURL }}` variable in the template is hardcoded by Supabase to use `/auth/confirm`. In this case:

1. Keep the email template as simple HTML with manual URL construction (as shown above)
2. Make sure your app handles both `/auth/callback` and `/auth/confirm` routes (already done)
3. Check Supabase logs: Dashboard → Logs → Auth to see what URL is being generated

## Manual User Creation Workaround

If email invitations continue to fail, create users manually:

```sql
-- 1. Insert user into auth.users (Supabase will send confirmation email)
-- This requires service role key, so do it from Supabase Dashboard SQL Editor

-- 2. Or have users sign up directly at:
-- https://dealdesk-monogoto.netlify.app/login

-- 3. Then manually confirm them with the SQL above
```