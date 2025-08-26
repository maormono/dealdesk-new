# Netlify Deployment Checklist

## ⚠️ IMPORTANT: Manual Steps Required in Netlify Dashboard

### 1. Check Site Connection
Go to: https://app.netlify.com

1. Is your site connected to the GitHub repository `maormono/dealdesk`?
2. Is it deploying from the `main` branch?
3. Is the site name `dealdesk-monogoto`?

### 2. Build Settings (Site Settings → Build & deploy)
Verify these settings:

- **Base directory**: (leave empty or set to `.`)
- **Build command**: `cd frontend && npm install && npm run build`
- **Publish directory**: `frontend/dist`
- **Production branch**: `main`

### 3. Environment Variables (Site Settings → Environment variables)
Add these variables:

```
VITE_SUPABASE_URL=https://uddmjjgnexdazfedrytt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0
VITE_DEV_MODE=false
VITE_SITE_URL=https://dealdesk-monogoto.netlify.app
```

### 4. Check Recent Deployments
In the Netlify dashboard:
1. Click on "Deploys" tab
2. Check if recent deployments are:
   - ✅ Published (green)
   - ❌ Failed (red)
   - ⏳ Building (yellow)

If deployments are failing, click on a failed deploy to see the error logs.

### 5. Common Issues to Check:

#### If you see "Site not found":
- The build might be failing
- Check the deploy logs for errors
- Make sure the publish directory is correct (`frontend/dist`)

#### If builds are failing:
- Check if Node version is set (should be 18 or higher)
- Check if all dependencies are in package.json
- Look for TypeScript errors in the build logs

### 6. Clear Cache and Redeploy
If everything looks correct but still not working:

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**

### 7. Check Domain Settings
Go to **Domain settings** and verify:
- Primary domain is: `dealdesk-monogoto.netlify.app`

## Files We've Created/Updated:
- `/netlify.toml` - Main configuration (in repository root)
- `/frontend/public/_redirects` - SPA routing rules
- `/frontend/src/pages/AuthCallback.tsx` - Auth handler
- `/frontend/src/components/AuthHandler.tsx` - Auth redirect handler

## What Should Be Working:
1. Main site at https://dealdesk-monogoto.netlify.app
2. Magic links redirecting to `/?code=...`
3. Auth callbacks at `/auth/callback` and `/auth/confirm`
4. All routes handled by React Router

## If Still Not Working:
The most likely issue is that:
1. The site is not properly connected to GitHub
2. Environment variables are not set in Netlify
3. Build settings are incorrect
4. The deployment is failing (check deploy logs)