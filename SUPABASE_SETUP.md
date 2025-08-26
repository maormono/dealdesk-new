# 🚀 DealDesk Supabase Setup Guide

This guide will help you set up Supabase to properly store and manage your multi-source pricing data.

## Prerequisites

- Supabase account (free at https://supabase.com)
- Your Excel files in the project folder

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - Project name: `dealdesk` (or your choice)
   - Database password: (save this securely!)
   - Region: Choose closest to you
4. Click "Create Project" and wait ~2 minutes

## Step 2: Get Your Credentials

Once project is created:

1. Go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (long string)
   - **Service Role Key**: Keep the one you provided: `sbp_ef7db518966275b30e542698d0d564b7e7916046`

## Step 3: Quick Setup

I've created an automated setup. Just run:

```bash
# Make the setup script executable
chmod +x quick-setup-supabase.sh

# Run it
./quick-setup-supabase.sh
```

When prompted, paste your:
1. Project URL
2. Anon key

The script will handle everything else!

## Step 4: Verify It Worked

After setup completes, you can:

1. **Check Supabase Dashboard**:
   - Go to Table Editor in Supabase
   - You should see tables: `networks`, `network_pricing`, `network_restrictions`

2. **Run the test**:
   ```bash
   python3 test-supabase-pricing.py
   ```

   Should show:
   - Tele2 AUSTA = €0.50 ✅
   - A1 AUSTA = €1.25 ✅

## What Gets Created

### Database Tables:
- **networks**: All TADIGs and network names
- **network_pricing**: Pricing from each source (A1, Telefonica, Tele2)
- **network_restrictions**: Prohibited networks, restrictions
- **pricing_sources**: The three data sources

### Key Features:
- ✅ Tele2 pricing from Invoice (€0.50 for AUSTA)
- ✅ A1 pricing from A1 file (€1.25 for AUSTA)
- ✅ Telefonica pricing (no IMSI fees)
- ✅ Proper restriction tracking (prohibited, no roaming, etc.)

## Troubleshooting

If you get errors:

1. **"relation does not exist"**: Schema didn't apply
   - Go to SQL Editor in Supabase
   - Paste contents of `supabase/schema.sql`
   - Click "Run"

2. **"File not found"**: Excel files missing
   - Make sure all Excel files are in project root
   - Especially: `0- Invoice Monogoto 2025-04.xlsx`

3. **"Invalid API key"**: Wrong credentials
   - Double-check your `.env.local` file
   - Make sure no extra spaces in keys

## Manual Alternative

If automated setup fails, you can set up manually:

1. **Create schema** in Supabase SQL Editor:
   - Copy everything from `supabase/schema.sql`
   - Paste in SQL Editor
   - Click Run

2. **Update `.env.local`**:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run import**:
   ```bash
   pip3 install supabase pandas openpyxl python-dotenv
   python3 supabase/import_to_supabase.py
   ```

## Success Checklist

✅ Supabase project created
✅ Schema applied (tables visible)
✅ Data imported (networks show in tables)
✅ Test shows correct IMSI fees
✅ API endpoints working

---

Need help? The key insight: **Invoice = Tele2 pricing** with €0.50 IMSI fee for AUSTA!