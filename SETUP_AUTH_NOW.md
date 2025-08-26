# 🔐 Set Up Authentication on Your EXISTING Supabase Instance

Your app is now connected to your existing Supabase instance (`uddmjjgnexdazfedrytt`) that already has all your pricing data!

## ✅ What's Already Done:

1. **Frontend connected** to your existing Supabase instance
2. **Login page ready** with email/password fields
3. **Authentication code** fully implemented

## 📋 Quick Setup Steps (5 minutes):

### Step 1: Enable Authentication in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/uddmjjgnexdazfedrytt
2. Navigate to **Authentication → Providers**
3. Enable **Email** provider (toggle it ON)
4. Save changes

### Step 2: Run the Auth Setup SQL

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the ENTIRE contents of `setup-auth-on-existing-supabase.sql`
4. Click **Run**

This creates:
- `allowed_users` table (won't affect your pricing tables)
- Adds israel@monogoto.io and maor@monogoto.io to allowed list
- Sets up domain restrictions

### Step 3: Configure Auth Settings (Optional but Recommended)

1. Go to **Authentication → URL Configuration**
2. Set Site URL to: `http://localhost:5173`
3. Add to Redirect URLs:
   - `http://localhost:5173`
   - Your production URL (when deployed)

### Step 4: Test It!

1. Your app is running at: http://localhost:5173
2. You'll be redirected to the login page
3. Click "Sign Up" (first time) or "Sign In"
4. Use one of these emails:
   - `israel@monogoto.io`
   - `maor@monogoto.io`
5. Create a password
6. You're in! 🎉

## 🔍 Current Status:

- **Supabase URL**: https://uddmjjgnexdazfedrytt.supabase.co
- **App Status**: Running at http://localhost:5173
- **Auth Mode**: Real authentication (not dev mode)
- **Allowed Users**: israel@monogoto.io, maor@monogoto.io

## ⚠️ Important Notes:

1. **Same Supabase Instance**: This uses your EXISTING Supabase that has all the pricing data
2. **No Data Loss**: The auth tables are separate from your pricing tables
3. **Sign Out Button**: Will appear in the header once logged in

## 🚀 Quick Commands:

```bash
# If app isn't running:
cd /Users/maor/dev/dealdesk/frontend
npm run dev

# Check current mode:
cat .env | grep VITE_DEV_MODE
# Should show: VITE_DEV_MODE=false

# Switch to dev mode (bypass auth):
# Edit .env and set VITE_DEV_MODE=true
```

## 🔒 Security Features:

- ✅ Only @monogoto.io emails can register
- ✅ Only israel@ and maor@ are in allowed list
- ✅ Database-level enforcement
- ✅ Session management
- ✅ Automatic sign-out for unauthorized users

## Need Help?

1. **Can't see login?** Check that VITE_DEV_MODE=false in .env
2. **Can't sign up?** Make sure you ran the SQL script
3. **Auth not working?** Verify Email provider is enabled in Supabase

Your authentication is ready to use with your existing Supabase instance!