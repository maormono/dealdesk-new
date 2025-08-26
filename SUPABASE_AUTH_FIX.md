# Fix Supabase Auth Email Confirmation Issue

## The Problem
When users receive the email invitation from Supabase and click the link, they get a "Site not found" error on Netlify. This happens because the redirect URL in the email is not configured correctly.

## Solution Steps

### 1. Update Supabase Dashboard Settings

Go to your Supabase Dashboard and navigate to:
**Authentication > URL Configuration**

Set the following:

- **Site URL**: `https://dealdesk-monogoto.netlify.app`
- **Redirect URLs** (add ALL of these):
  ```
  https://dealdesk-monogoto.netlify.app
  https://dealdesk-monogoto.netlify.app/*
  https://dealdesk-monogoto.netlify.app/auth/callback
  https://dealdesk-monogoto.netlify.app/auth/confirm
  http://localhost:5173
  http://localhost:5173/*
  http://localhost:5173/auth/callback
  http://localhost:5173/auth/confirm
  ```

### 2. Update Email Templates (Important!)

Go to: **Authentication > Email Templates**

For each template (Invite User, Confirm Signup, Magic Link), update the action URL:

**Current (Wrong):**
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

**Change to:**
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
```

Note: We use `/auth/callback` not `/auth/confirm` because that's the route we have defined in our React app.

### 3. For Magic Link/OTP Template

Update the **Magic Link** template:
```
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/callback?code={{ .Token }}">Log In</a></p>
```

### 4. For Invite User Template

Update the **Invite User** template:
```
<h2>You have been invited</h2>
<p>You have been invited to create a user on DealDesk. Follow this link to accept the invite:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Accept the invite</a></p>
```

### 5. Run SQL to Check/Fix Users

Run this SQL in Supabase SQL Editor to check user status:

```sql
-- Check all pending users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Pending Confirmation'
        ELSE 'Confirmed'
    END as status
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ORDER BY created_at DESC;

-- Manually confirm a user if needed (replace email)
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'user@monogoto.io' 
AND email_confirmed_at IS NULL;
```

### 6. Test the Flow

1. Send a new invitation from User Management
2. Check that the email link points to: `https://dealdesk-monogoto.netlify.app/auth/callback?...`
3. Click the link - it should work now

## Alternative: Direct User Creation

If email invitations continue to have issues, you can create users directly:

1. Have the user go to: `https://dealdesk-monogoto.netlify.app/login`
2. Click "Sign up"
3. Enter their @monogoto.io email
4. They'll receive a confirmation email
5. After confirming, an admin can set their role in User Management

## Troubleshooting

If users still can't access after clicking the email link:

1. Check browser console for errors
2. Verify the URL in the email starts with `https://dealdesk-monogoto.netlify.app/auth/callback`
3. Make sure the token hasn't expired (links expire after 1 hour by default)
4. Check Supabase logs: Dashboard > Logs > Auth

## Important Notes

- Email links expire after 1 hour by default
- Users must use @monogoto.io email addresses
- After email confirmation, users still need to be assigned a role by an admin
- The Netlify `_redirects` file is already configured correctly with `/* /index.html 200`