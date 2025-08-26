# Fix 500 Error on Password Reset

## The Problem
Getting a 500 Internal Server Error when trying to send password reset emails. This usually means:
1. The email template has syntax errors
2. SMTP is not configured
3. The template variables are incorrect

## Immediate Fix in Supabase Dashboard

### 1. Go to Email Templates
https://app.supabase.com/project/uddmjjgnexdazfedrytt/auth/templates

### 2. Select "Reset Password" Template

### 3. Use This EXACT Template (Copy/Paste):
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

**Important:** Use `{{ .ConfirmationURL }}` NOT custom URLs. This is the default variable that Supabase expects.

### 4. Save the Template

### 5. Go to URL Configuration
https://app.supabase.com/project/uddmjjgnexdazfedrytt/auth/url-configuration

### 6. Ensure These Settings:
- **Site URL**: `https://deal-desk.netlify.app`
- **Redirect URLs** must include:
  - `https://deal-desk.netlify.app/auth/callback`
  - `https://deal-desk.netlify.app/auth/confirm`

## Why This Works
- `{{ .ConfirmationURL }}` is the built-in Supabase variable
- It automatically constructs the correct URL using your Site URL
- The 500 error happens when Supabase can't process the template

## Test It
1. Go to https://deal-desk.netlify.app/login
2. Enter your email
3. Click "Forgot Password?"
4. It should work now!

## Alternative: Use Magic Link Instead
If password reset still doesn't work, users can:
1. Use "Sign in with Magic Link" instead
2. This sends a login link without needing a password
3. After logging in, they can change their password in settings

## Check SMTP Settings (Optional)
If you continue having issues, check if SMTP is configured:
- Go to Settings → Auth → SMTP Settings
- If not configured, Supabase uses their default email service
- Default service has rate limits that might cause 500 errors