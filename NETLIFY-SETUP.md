# Netlify Environment Variables Setup

## Required Environment Variables

Add these in Netlify Dashboard → Site Settings → Environment Variables:

```bash
# Authentication Mode
VITE_DEV_MODE=false

# Supabase Configuration
VITE_SUPABASE_URL=https://uddmjjgnexdazfedrytt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0

# Gemini AI Configuration
VITE_GEMINI_API_KEY=AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic
```

## How to Add Environment Variables in Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (dealdesk-monogoto)
3. Go to **Site configuration** → **Environment variables**
4. Click **"Add a variable"**
5. Choose **"Add a single variable"**
6. Add each variable one by one:
   - Key: `VITE_DEV_MODE`
   - Value: `false`
   - Click "Create variable"
7. Repeat for all variables above

## After Adding Variables

1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for deployment to complete

## Features Enabled

With these environment variables:
- ✅ Supabase Authentication (for @monogoto.io emails)
- ✅ AI Advisor with Gemini Pro
- ✅ Natural language queries for pricing data
- ✅ Database access for pricing information

## Testing the AI Advisor

Once deployed with the Gemini API key, you can test queries like:
- "Show me countries in Europe with data cost less than $1/GB"
- "Which operators offer IoT services?"
- "What are the cheapest SMS rates in Asia?"
- "Compare pricing between A1 and Telefonica"

## Troubleshooting

If the AI Advisor shows "API key required":
1. Verify the environment variable is set correctly
2. Make sure you triggered a new deploy after adding the variable
3. Check the browser console for any errors

If authentication fails:
1. Ensure VITE_DEV_MODE is set to `false`
2. Verify Supabase URL and API key are correct
3. Check that users are created in Supabase with confirmed emails