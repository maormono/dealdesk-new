# Testing Authentication - Quick Setup

## Step 1: Set up Supabase (if not done already)

### Option A: Use Existing Supabase Project
If you already have a Supabase project, add your credentials to `/frontend/.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Option B: Create New Supabase Project
1. Go to https://supabase.com and create a free project
2. Once created, go to Settings > API
3. Copy the Project URL and anon public key
4. Add them to `/frontend/.env`

## Step 2: Run Database Setup

1. Go to your Supabase Dashboard
2. Click on SQL Editor
3. Copy and paste the contents of `setup-auth-restrictions.sql`
4. Click "Run" to execute

## Step 3: Configure Auth Settings

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable "Email" provider
3. (Optional) Enable "Google" provider for SSO

## Step 4: Start the Application

```bash
cd /Users/maor/dev/dealdesk/frontend
npm run dev
```

## Step 5: Test Login Flow

### Test Scenarios:

1. **Open the app**: http://localhost:5173
   - You should be redirected to `/login`

2. **Test allowed user**:
   - Email: `israel@monogoto.io` or `maor@monogoto.io`
   - Create a password
   - Should successfully log in

3. **Test blocked user**:
   - Email: `test@monogoto.io` (not in allowed list)
   - Should see error message

4. **Test wrong domain**:
   - Email: `test@gmail.com`
   - Should be rejected

## Step 6: Verify Logout Button

Once logged in, you should see:
- Your email displayed in the header
- A "Sign Out" button next to it

## Troubleshooting

### Can't see logout button?

1. Check browser console for errors:
   - Open DevTools (F12)
   - Look for any red errors

2. Verify authentication state:
   ```javascript
   // In browser console:
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Current session:', session)
   ```

3. Check if user object is available:
   - The logout button only shows when `user` exists
   - It's in the header next to your email

### Login not working?

1. **Check Supabase connection**:
   - Verify .env variables are correct
   - Make sure Supabase project is active

2. **Database triggers not set up**:
   - Re-run the SQL setup script
   - Check Supabase logs for errors

3. **Email not sending**:
   - Check spam folder
   - Verify email settings in Supabase

### For Quick Testing (Development Only)

If you want to test without setting up Supabase immediately, you can create a mock mode:

1. Create a test user directly in Supabase Dashboard:
   - Go to Authentication > Users
   - Click "Invite User"
   - Enter `israel@monogoto.io` or `maor@monogoto.io`

2. Or temporarily bypass authentication (for testing only):
   - Comment out the `<ProtectedRoute>` wrapper in App.tsx
   - This will let you access the app without login

## View Current App State

To see if authentication is working:

1. **Check localStorage**:
   ```javascript
   // In browser console
   localStorage.getItem('supabase.auth.token')
   ```

2. **Check React DevTools**:
   - Install React DevTools extension
   - Look for AuthContext provider
   - Check if user state is populated

## Quick Commands

```bash
# Start frontend
cd /Users/maor/dev/dealdesk/frontend && npm run dev

# Check if Supabase is configured
cat /Users/maor/dev/dealdesk/frontend/.env

# View auth setup SQL
cat /Users/maor/dev/dealdesk/setup-auth-restrictions.sql
```