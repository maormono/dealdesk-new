# Fix User Invitation Flow - CORRECT URL

## ✅ THE CORRECT URL IS: `https://deal-desk.netlify.app/`

Not `dealdesk-monogoto.netlify.app` - that domain doesn't exist!

## Step 1: Update Supabase Dashboard

Go to **Authentication → URL Configuration** and update:

### Site URL (MUST BE EXACT):
```
https://deal-desk.netlify.app
```

### Redirect URLs (add ALL of these):
```
https://deal-desk.netlify.app
https://deal-desk.netlify.app/*
https://deal-desk.netlify.app/auth/callback
https://deal-desk.netlify.app/auth/confirm
http://localhost:5173
http://localhost:5173/*
http://localhost:5173/auth/callback
```

## Step 2: Update ALL Email Templates

Go to **Authentication → Email Templates**:

### Invite User Template:
```html
<h2>Welcome to DealDesk!</h2>
<p>You have been invited to join the DealDesk platform.</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=invite" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=invite</p>
```

### Magic Link Template:
```html
<h2>Your Magic Link</h2>
<p>Click below to sign in to DealDesk:</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=magiclink" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=magiclink</p>
```

### Confirm Signup Template:
```html
<h2>Confirm Your Email</h2>
<p>Please confirm your email address for DealDesk:</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=email" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm Email</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=email</p>
```

### Reset Password Template:
```html
<h2>Reset Your Password</h2>
<p>Click below to reset your DealDesk password:</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=recovery" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=recovery</p>
```

## Step 3: Update Environment Variables

In your local `.env` file:
```
VITE_SITE_URL=https://deal-desk.netlify.app
```

## Step 4: Test the Flow

1. Go to: https://deal-desk.netlify.app/user-management
2. Send an invitation
3. Check the email - link should point to `https://deal-desk.netlify.app/auth/callback?...`
4. Click the link - it should work!

## Step 5: Update Code References

The invitation function should use the correct URL: