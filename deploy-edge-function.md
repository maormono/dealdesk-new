# Deploy Edge Function Instructions

To deploy the invite-user Edge Function to Supabase:

## Prerequisites
1. Install Supabase CLI if not already installed:
```bash
brew install supabase/tap/supabase
```

2. Login to Supabase:
```bash
supabase login
```

## Deploy the Function

1. Link your project (you'll need your project ref from Supabase dashboard):
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

2. Deploy the invite-user function:
```bash
supabase functions deploy invite-user
```

## What the Edge Function Does

The `invite-user` Edge Function provides secure, admin-only user invitations:

1. **Verifies the requester is an admin** - Checks the user_profiles table
2. **Validates email domain** - Only allows @monogoto.io emails  
3. **Uses Admin API** - Calls `inviteUserByEmail` with service role key
4. **Creates initial profile** - Sets up user_profile with default viewer role
5. **Returns proper errors** - Handles existing users and other edge cases

## Security Features

- Only admins can invite users (checked against user_profiles.role)
- Service role key is only accessible in the Edge Function, not frontend
- Email domain restriction enforced
- Proper CORS headers for frontend access
- User authentication required

## After Deployment

The frontend will automatically use the Edge Function when admins click "Send Invitation" in the User Management page.