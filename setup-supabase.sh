#!/bin/bash

echo "🚀 DealDesk Supabase Setup"
echo "=========================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing..."
    brew install supabase/tap/supabase
fi

echo "📝 Setting up Supabase project..."
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Go to https://supabase.com and create a new project"
echo "2. Once created, go to Settings > API"
echo "3. Copy your project URL and anon key"
echo "4. Update the .env.local file with these values"
echo ""
read -p "Press enter when you have updated .env.local with your project details..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

echo ""
echo "📊 Creating database schema..."
echo ""

# Apply the schema using the Supabase CLI
supabase db push --db-url "$DATABASE_URL" < supabase/schema.sql

echo "✅ Schema created!"
echo ""
echo "📦 Installing Python dependencies for import..."

# Install Python dependencies
pip3 install supabase pandas openpyxl python-dotenv

echo ""
echo "🔄 Running data import..."
echo ""

# Run the import script
python3 supabase/import_to_supabase.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "You can now access your pricing data via the API endpoints:"
echo "  - GET /api/pricing/search?query=australia"
echo "  - GET /api/pricing/compare/AUSTA"
echo "  - GET /api/pricing/by-source?source=Tele2"
echo "  - GET /api/pricing/australia"
echo ""
echo "Check the Supabase dashboard to verify the data!"