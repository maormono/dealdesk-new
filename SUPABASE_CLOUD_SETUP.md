# Setting Up Supabase Cloud (Free Tier)

Since Docker is not available locally, let's set up a free Supabase cloud project instead.

## Quick Setup Steps

### 1. Create Free Supabase Account

1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or Email
4. Create a new project (free tier includes):
   - 500MB database
   - 2GB bandwidth
   - 50,000 monthly active users
   - Unlimited API requests

### 2. Get Your Project Credentials

Once your project is created:

1. Go to Settings → API
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Update Your .env File

Replace the contents of `/frontend/.env` with:

```env
# Set to false to use real authentication
VITE_DEV_MODE=false

# Your Supabase credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API
VITE_API_URL=http://localhost:3001
```

### 4. Run the Database Setup

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste this SQL:

```sql
-- Create allowed users table
CREATE TABLE IF NOT EXISTS public.allowed_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Insert the two allowed emails
INSERT INTO public.allowed_users (email) VALUES
    ('israel@monogoto.io'),
    ('maor@monogoto.io')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Create policy for reading allowed users
CREATE POLICY "Anyone can view allowed users" ON public.allowed_users
    FOR SELECT USING (true);

-- Create function to check if user is allowed
CREATE OR REPLACE FUNCTION public.check_user_allowed()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email ends with @monogoto.io
    IF NOT (NEW.email LIKE '%@monogoto.io') THEN
        RAISE EXCEPTION 'Only @monogoto.io email addresses are allowed';
    END IF;
    
    -- Check if email is in allowed list
    IF NOT EXISTS (
        SELECT 1 FROM public.allowed_users 
        WHERE LOWER(email) = LOWER(NEW.email)
    ) THEN
        RAISE EXCEPTION 'Your email is not in the allowed users list. Please contact israel@monogoto.io for access.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS check_user_allowed_trigger ON auth.users;
CREATE TRIGGER check_user_allowed_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_allowed();
```

4. Click **Run**

### 5. Configure Authentication

1. Go to **Authentication → Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google** provider for SSO:
   - Add redirect URL: `http://localhost:5173`
   - Add your Google OAuth credentials

### 6. Test It!

1. Restart your app:
   ```bash
   cd /Users/maor/dev/dealdesk/frontend
   npm run dev
   ```

2. Go to http://localhost:5173
3. You should see the login page
4. Sign up with `maor@monogoto.io` or `israel@monogoto.io`

## Alternative: Quick Test Without Cloud

If you just want to see the UI working without setting up Supabase:

1. Keep `VITE_DEV_MODE=true` in your `.env`
2. The app will bypass authentication
3. You'll be logged in as `maor@monogoto.io` automatically

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file has valid credentials
- Restart the dev server after changing `.env`

### Can't sign up
- Check that the SQL script ran successfully
- Verify email is `israel@monogoto.io` or `maor@monogoto.io`
- Check Supabase logs for trigger errors

### Want to add more users?
Run this in SQL Editor:
```sql
INSERT INTO public.allowed_users (email) VALUES
    ('newuser@monogoto.io')
ON CONFLICT (email) DO NOTHING;
```