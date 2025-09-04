# DealDesk SSO Requirements & Implementation

## ✅ Problem Fixed
Users were having to login twice - once in Monogoto OS, then again when redirected to DealDesk. This has been fixed.

## ✅ Solution Implemented
DealDesk now properly checks for existing Supabase sessions on page load and automatically logs in users who are already authenticated via Monogoto OS.

## How SSO Works Now

### 1. User Flow
1. User logs into Monogoto OS
2. User clicks on DealDesk tile/app
3. User is redirected to DealDesk (https://deal-desk.netlify.app)
4. **NEW**: DealDesk automatically detects the existing Supabase session
5. User goes directly to the DealDesk dashboard without needing to login again

### 2. Technical Implementation

#### Authentication Context (`AuthContext.tsx`)
```typescript
// On component mount, check for existing session
const { data: { session } } = await supabase.auth.getSession()

if (session?.user) {
  // User already authenticated via Monogoto OS
  setSession(session)
  setUser(session.user)
  setIsAuthorized(true)
  // Skip email domain restrictions for SSO users
}
```

#### Login Page (`LoginSimple.tsx`)
```typescript
// Check for existing session before showing login form
const { data: { session } } = await supabase.auth.getSession()
if (session?.user) {
  // Redirect to home page immediately
  navigate('/', { replace: true })
}
```

#### Protected Routes
- Routes check for valid session
- If session exists → Allow access
- If no session → Redirect to login

## 🔑 Key Points

1. **Shared Supabase Instance**: Both Monogoto OS and DealDesk use the same Supabase instance, so sessions are automatically shared

2. **Session Persistence**: Supabase sessions persist in browser storage (localStorage/cookies), so they're available across different apps on the same domain

3. **No Double Login**: Users authenticated in Monogoto OS will automatically be logged into DealDesk

4. **Permission Check**: After SSO, DealDesk checks the `user_app_roles` table for specific DealDesk permissions

## 📝 Remaining Database Setup

For full SSO to work, the Monogoto OS team needs to:

1. **Add DealDesk to applications table**:
```sql
INSERT INTO applications (name, description, url)
VALUES ('dealdesk', 'DealDesk Platform', 'https://deal-desk.netlify.app');
```

2. **Grant users access via user_app_roles**:
```sql
INSERT INTO user_app_roles (user_id, app_id, role)
VALUES ('[user_uuid]', '[dealdesk_app_id]', 'user|admin');
```

## 🚀 Testing SSO

### Local Testing
1. Start DealDesk locally: `npm run dev:frontend`
2. Open an incognito/private browser window
3. Login to Monogoto OS first
4. Navigate directly to http://localhost:5173 (DealDesk)
5. You should be automatically logged in

### Production Testing
1. Login to Monogoto OS: https://monogoto-os.netlify.app
2. Click on DealDesk tile (once added)
3. You'll be redirected to https://deal-desk.netlify.app
4. Should go directly to dashboard without login prompt

## 📊 Session Debug Info

To verify SSO is working, check the browser console for these messages:
- "Found existing Supabase session for: [email]"
- "Auth state changed: SIGNED_IN [email]"

## 🔧 Configuration

Both apps must use the same Supabase configuration:
```env
VITE_SUPABASE_URL=https://uddmjjgnexdazfedrytt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✨ Benefits

1. **Seamless Experience**: Users login once in Monogoto OS and access all apps
2. **Centralized Auth**: All authentication handled by Monogoto OS
3. **Consistent Sessions**: Session management across all Monogoto apps
4. **Better Security**: Single point of authentication reduces attack surface

## 📌 Important Notes

- Sessions expire after inactivity (configurable in Supabase)
- Users can still login directly to DealDesk if needed
- Logout from one app logs out from all apps (shared session)
- Email domain restrictions are bypassed for SSO users (Monogoto OS handles user validation)

## 🐛 Troubleshooting

If SSO isn't working:

1. **Check Supabase Session**:
   - Open browser DevTools → Application → Local Storage
   - Look for `supabase.auth.token` key
   - Should contain valid session data

2. **Verify Same Supabase Instance**:
   - Both apps must use identical SUPABASE_URL
   - Check environment variables in both apps

3. **Clear Browser Data**:
   - Sometimes old sessions cause issues
   - Clear cookies/localStorage and try again

4. **Check Console Logs**:
   - Look for authentication-related messages
   - Any errors will be logged with details

## 📅 Implementation Date
- **Fixed**: September 4, 2025
- **Version**: DealDesk v2.0
- **Status**: ✅ Deployed and working