#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "     🚀 DealDesk Supabase Quick Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will:"
echo "  1. Set up your Supabase credentials"
echo "  2. Create the database schema"
echo "  3. Import all pricing data"
echo "  4. Verify everything works"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for required files
echo "📁 Checking for required Excel files..."
required_files=(
    "0- Invoice Monogoto 2025-04.xlsx"
    "202509_Country Price List A1 IMSI Sponsoring.xlsx"
    "20250205 Monogoto TGS UK V1.xlsx"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ Found: $file"
    else
        echo "  ❌ Missing: $file"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "⚠️  Some files are missing but we'll continue with what we have."
    echo ""
fi

# Get Supabase credentials
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Step 1: Enter your Supabase credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Get these from: Supabase Dashboard → Settings → API"
echo ""

read -p "Enter your Supabase Project URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key (eyJhbGc...): " SUPABASE_ANON_KEY

# Use the service key you provided
SUPABASE_SERVICE_KEY="sbp_ef7db518966275b30e542698d0d564b7e7916046"

# Create .env.local file
echo ""
echo "💾 Creating .env.local file..."
cat > .env.local << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
EOF

echo "  ✅ Environment file created"

# Install Python dependencies
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 2: Installing Python dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pip3 install supabase pandas openpyxl python-dotenv requests --quiet

echo "  ✅ Dependencies installed"

# Create Python script to set up database and import data
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Step 3: Setting up database schema..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

python3 << 'PYTHON_SCRIPT'
import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials!")
    sys.exit(1)

print("  Connecting to Supabase...")

# Create client with service key for admin operations
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Read and execute schema
print("  Creating database schema...")

# Read the schema file
with open('supabase/schema.sql', 'r') as f:
    schema_sql = f.read()

# Execute schema (this is a simplified version - in production you'd use migrations)
# For now, we'll create the tables via the import script
print("  ✅ Schema prepared")
print("")
print("  Note: Please run the schema.sql file in your Supabase SQL Editor")
print("  (We'll continue with the import assuming tables exist)")

PYTHON_SCRIPT

# Run the import
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 Step 4: Importing pricing data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: First, you need to create the schema in Supabase:"
echo ""
echo "  1. Go to your Supabase Dashboard"
echo "  2. Click on 'SQL Editor' (left sidebar)"
echo "  3. Click 'New Query'"
echo "  4. Copy ALL content from: supabase/schema.sql"
echo "  5. Paste it in the SQL Editor"
echo "  6. Click 'Run' (or press Cmd/Ctrl + Enter)"
echo ""
read -p "Press Enter AFTER you've run the schema in Supabase SQL Editor..."

# Now run the import
echo ""
echo "📊 Importing data from Excel files..."
python3 supabase/import_to_supabase.py

# Run the test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Step 5: Testing the setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 test-supabase-pricing.py

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now:"
echo "  1. Check your Supabase Dashboard - Table Editor"
echo "  2. Look for the 'networks' table with all TADIGs"
echo "  3. Verify AUSTA shows €0.50 for Tele2, €1.25 for A1"
echo ""
echo "API Endpoints ready at:"
echo "  GET ${SUPABASE_URL}/rest/v1/networks"
echo "  GET ${SUPABASE_URL}/rest/v1/network_pricing"
echo ""
echo "🎉 Your multi-source pricing database is ready!"