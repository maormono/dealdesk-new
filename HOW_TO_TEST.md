# 🧪 How to Test the Authentication System

## Current Setup: Development Mode Enabled ✅

The app is currently configured to run in **Development Mode**, which bypasses authentication for easy testing.

## Testing the App

### 1. Start the Application
```bash
cd /Users/maor/dev/dealdesk/frontend
npm run dev
```

### 2. Open in Browser
Navigate to: http://localhost:5173

## What You Should See

### In Development Mode (Current):
- ✅ **NO login required** - you'll go straight to the main app
- ✅ **User shown as**: maor@monogoto.io
- ✅ **Sign Out button visible** in the top-right header
- ✅ Yellow banner saying "Development Mode - Authentication bypassed"

### Sign Out Button Location:
The Sign Out button is in the **top-right corner of the header**, showing:
- User icon + "maor@monogoto.io"
- Logout icon + "Sign Out" button (turns red on hover)

## Switching Between Modes

### Enable Development Mode (Current Setting):
Edit `/frontend/.env`:
```env
VITE_DEV_MODE=true
```

### Enable Production Mode (Requires Supabase):
Edit `/frontend/.env`:
```env
VITE_DEV_MODE=false
VITE_SUPABASE_URL=your-actual-supabase-url
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

## Testing the Login Page

Even in dev mode, you can still view the login page:
1. Navigate to: http://localhost:5173/login
2. You'll see the beautiful login page with:
   - IAI logo
   - Animated background
   - Login form
   - Security badges

## Features to Test

1. **Header User Info**:
   - Check that email shows: "maor@monogoto.io"
   - Sign Out button is visible and clickable

2. **Navigation**:
   - "Price Updater" button should work
   - All navigation should be accessible

3. **File Upload**:
   - Try uploading an Excel file
   - Should work normally

## Troubleshooting

### Can't See Sign Out Button?
1. **Check browser width** - might be hidden on mobile view
2. **Look in the header** - right side, between "Price Updater" and "MVP v1.0"
3. **Clear browser cache** and refresh

### Still Not Working?
1. Stop the server (Ctrl+C)
2. Check the .env file has `VITE_DEV_MODE=true`
3. Restart with `npm run dev`
4. Hard refresh browser (Cmd+Shift+R on Mac)

### View Console Logs
Open browser DevTools (F12) and check console for:
- "🔧 Dev Mode Active - Authentication bypassed"
- "📧 Logged in as: maor@monogoto.io"

## Production Testing (When Ready)

To test with real Supabase authentication:

1. Set up Supabase project
2. Update `.env` with real credentials
3. Set `VITE_DEV_MODE=false`
4. Run SQL setup script in Supabase
5. Restart the app

## Quick Status Check

Run this in browser console to check auth state:
```javascript
// Check if in dev mode
console.log('Dev Mode:', import.meta.env.VITE_DEV_MODE)

// Check current path
console.log('Current path:', window.location.pathname)
```

---

**Note**: The app is fully functional in dev mode. The Sign Out button will refresh the page when clicked (simulating a logout in dev mode).