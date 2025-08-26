# Simple Fix for DealDesk Auth - No SQL Needed!

Since `auth.config` doesn't exist, you just need to update 2 things in the Supabase Dashboard:

## 1. URL Configuration (Already Open in Your Browser)

Go to the **URL Configuration** tab that's open and set:

- **Site URL**: `https://deal-desk.netlify.app`

In the **Redirect URLs** section, add these URLs (click "Add URL" for each):
```
https://deal-desk.netlify.app
https://deal-desk.netlify.app/*
https://deal-desk.netlify.app/auth/callback
https://deal-desk.netlify.app/auth/confirm
http://localhost:5173
http://localhost:5173/*
http://localhost:5173/auth/callback
```

Click **Save** at the bottom.

## 2. Email Templates (Already Open in Your Browser)

Go to the **Email Templates** tab and update each template:

### Invite User Template
Replace the entire template with:
```html
<h2>Welcome to DealDesk!</h2>
<p>You have been invited to join the DealDesk platform.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Accept Invitation</a></p>
```

### Magic Link Template
Replace with:
```html
<h2>Your Magic Link</h2>
<p>Click to sign in to DealDesk:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Sign In</a></p>
```

### Confirm Signup Template  
Replace with:
```html
<h2>Confirm Your Email</h2>
<p>Please confirm your email for DealDesk:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm Email</a></p>
```

### Reset Password Template
Replace with:
```html
<h2>Reset Your Password</h2>
<p>Click to reset your DealDesk password:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

## That's it! 

After updating these 2 sections in Supabase Dashboard:
1. Go to https://deal-desk.netlify.app/user-management
2. Send an invitation
3. The email link will now work correctly!

## Important Notes:
- ✅ Use `{{ .SiteURL }}` in templates (it will use the Site URL you set)
- ✅ All callbacks go to `/auth/callback` (not `/auth/confirm`)
- ✅ The correct domain is `deal-desk.netlify.app`