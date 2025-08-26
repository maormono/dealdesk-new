# DealDesk Authentication Setup

## Quick Start - Testing Credentials

For immediate testing in development mode:
- Email: `maor@monogoto.io`
- Password: `123456` (only works in dev mode)

## Production Setup (Supabase)

### Creating Users with Passwords

1. **Via Supabase Dashboard**:
   - Go to Authentication → Users
   - Click "Add user" → "Create new user"
   - Enter email and password
   - Check "Auto Confirm User"
   - Click "Create User"

2. **Recommended Test Users**:
   ```
   Email: maor@monogoto.io
   Password: DealDesk2024!
   
   Email: israel@monogoto.io  
   Password: DealDesk2024!
   ```

### Fixing Existing Users Without Passwords

If you created users without passwords:
1. Delete the user in Supabase Dashboard
2. Recreate with a password (see above)
3. Or use "Send password recovery" option

### Environment Variables for Netlify

```env
VITE_DEV_MODE=false
VITE_SUPABASE_URL=https://uddmjjgnexdazfedrytt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### URL Configuration in Supabase

Go to Authentication → URL Configuration:
- Site URL: `https://dealdesk-monogoto.netlify.app`
- Redirect URLs: 
  - `https://dealdesk-monogoto.netlify.app`
  - `https://dealdesk-monogoto.netlify.app/*`

## Troubleshooting

### "Invalid API Key" Error
- Check environment variables in Netlify
- Ensure VITE_DEV_MODE=false in production
- Verify Supabase keys are correct

### Email Confirmation Issues
- Manually confirm users via SQL Editor:
  ```sql
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE email = 'maor@monogoto.io';
  ```

### Password Reset
- Use Supabase Dashboard → Users → Send password recovery
- Or delete and recreate user with password