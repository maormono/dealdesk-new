# Netlify Environment Variables

Add these environment variables in your Netlify dashboard:

1. Go to: https://app.netlify.com
2. Select your site
3. Go to Site Settings → Environment Variables
4. Add these variables:

```
VITE_DEV_MODE=false
VITE_SUPABASE_URL=https://uddmjjgnexdazfedrytt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0
VITE_API_URL=https://your-backend-url.com
```

Note: Replace VITE_API_URL with your actual backend URL if you have one deployed.