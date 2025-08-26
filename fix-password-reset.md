# Fix Password Reset Email Error

## The Problem
Getting "Error sending recovery email" with a 500 status code from Supabase.

## Quick Fix

### 1. Go to Supabase Email Templates
Open: https://app.supabase.com/project/uddmjjgnexdazfedrytt/auth/templates

### 2. Update the "Reset Password" Template

Find the **Reset Password** template and replace it with:

```html
<h2>Reset Your Password</h2>
<p>You requested a password reset for your DealDesk account.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>The link will expire in 1 hour.</p>
```

### 3. Also Check/Update the "Magic Link" Template

Make sure it's set to:

```html
<h2>Your Magic Link</h2>
<p>Click below to sign in to DealDesk:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Sign In to DealDesk</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>The link will expire in 1 hour.</p>
```

### 4. Verify Site URL is Correct

In **URL Configuration**, make sure:
- Site URL is: `https://deal-desk.netlify.app`
- Redirect URLs include: `https://deal-desk.netlify.app/auth/callback`

## Important Notes

- The error happens because Supabase can't generate the email with incorrect template variables
- Make sure to use `{{ .SiteURL }}` not hardcoded URLs
- The callback should go to `/auth/callback` not `/auth/confirm`

## Test After Fixing

1. Go back to the login page
2. Try "Forgot Password" again
3. It should work without errors now