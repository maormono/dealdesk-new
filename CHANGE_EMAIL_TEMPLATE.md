# Change the Invite User Email Template in Supabase

## Current Template (What you have):
```html
<h2>You have been invited</h2>
<p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p>
<p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>
```

## Change it to:
```html
<h2>You have been invited</h2>
<p>You have been invited to create a user on DealDesk. Follow this link to accept the invite:</p>
<p><a href="{{ .SiteURL }}/auth/callback{{ if .TokenHash }}?token_hash={{ .TokenHash }}&type=invite{{ end }}">Accept the invite</a></p>
```

## Alternative (if the above doesn't work):
```html
<h2>You have been invited</h2>
<p>You have been invited to create a user on DealDesk. Follow this link to accept the invite:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Accept the invite</a></p>
```

## Where to change it:
1. Go to Supabase Dashboard
2. Navigate to Authentication → Email Templates
3. Select "Invite User" template
4. Replace the template content with one of the options above
5. Click Save

## Also Update These Templates:

### Magic Link Template:
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Log In</a></p>
```

### Confirm Signup Template:
```html
<h2>Confirm your email</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email address</a></p>
```

### Password Recovery Template:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

## Important: Make sure Site URL is set correctly
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://dealdesk-monogoto.netlify.app`