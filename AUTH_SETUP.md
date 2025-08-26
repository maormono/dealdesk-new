# Authentication Setup Guide

## Prerequisites

1. Supabase project created at https://supabase.com
2. Environment variables configured

## Setup Steps

### 1. Configure Environment Variables

Create a `.env` file in the frontend directory:

```bash
cp frontend/.env.example frontend/.env
```

Then add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Run Database Setup

Execute the authentication setup SQL in your Supabase SQL editor:

```bash
# Copy the contents of setup-auth-restrictions.sql
# Paste and run in Supabase SQL editor
```

This will:
- Create an `allowed_users` table
- Add israel@monogoto.io and maor@monogoto.io to the allowed list
- Set up triggers to validate @monogoto.io domain
- Enforce email restrictions on signup

### 3. Configure Supabase Auth Settings

In your Supabase dashboard:

1. Go to Authentication > Providers
2. Enable Email provider
3. Enable Google OAuth (optional, for SSO)
   - Add authorized redirect URLs:
     - `http://localhost:5173` (development)
     - Your production domain

4. Go to Authentication > URL Configuration
5. Set Site URL to your app URL (e.g., `http://localhost:5173` for development)

### 4. Email Templates (Optional)

Customize email templates in Authentication > Email Templates:
- Confirmation email
- Password recovery
- Magic link

## Authentication Features

### Implemented Security

- ✅ Domain restriction: Only @monogoto.io emails allowed
- ✅ Whitelist: Only israel@monogoto.io and maor@monogoto.io can access
- ✅ Database-level enforcement via triggers
- ✅ Client-side validation
- ✅ Protected routes
- ✅ Session management
- ✅ Automatic sign-out for unauthorized users

### Login Methods

1. **Email + Password**: Traditional signup/signin
2. **Magic Link**: Passwordless email authentication
3. **Google SSO**: Sign in with Google (if configured)

## Adding New Allowed Users

To add new users to the allowed list, run this SQL in Supabase:

```sql
INSERT INTO public.allowed_users (email) VALUES
    ('newuser@monogoto.io')
ON CONFLICT (email) DO NOTHING;
```

Or use the provided function (as admin):

```sql
SELECT public.add_allowed_user('newuser@monogoto.io');
```

## Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:5173

3. You should be redirected to /login

4. Test authentication with:
   - ✅ israel@monogoto.io (should work)
   - ✅ maor@monogoto.io (should work)
   - ❌ other@monogoto.io (should be rejected)
   - ❌ anyone@gmail.com (should be rejected)

## Troubleshooting

### "Missing Supabase environment variables" error

Ensure your `.env` file contains valid Supabase credentials.

### Users can't sign up

1. Check that the SQL setup script was run successfully
2. Verify the email is in the allowed_users table
3. Check Supabase logs for trigger errors

### Authentication not working

1. Verify Supabase Auth is enabled
2. Check redirect URLs are configured
3. Ensure PKCE flow is enabled (default)