#!/bin/bash

echo "🚀 Supabase Cloud Setup Helper"
echo "================================"
echo ""
echo "This script will help you configure your Supabase cloud project."
echo ""

# Check if .env exists
if [ ! -f "frontend/.env" ]; then
    echo "Creating .env file..."
    cp frontend/.env.example frontend/.env
fi

echo "Please follow these steps:"
echo ""
echo "1. Go to https://supabase.com and create a free account"
echo "2. Create a new project (takes ~2 minutes to provision)"
echo "3. Once created, go to Settings → API"
echo "4. Copy your credentials"
echo ""

read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Update .env file
cat > frontend/.env << EOF
# Development Mode (set to true to bypass authentication)
VITE_DEV_MODE=false

# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API (if running locally)
VITE_API_URL=http://localhost:3001
EOF

echo ""
echo "✅ .env file updated!"
echo ""
echo "Next steps:"
echo "1. Go to your Supabase Dashboard → SQL Editor"
echo "2. Copy the contents of 'setup-auth-restrictions.sql'"
echo "3. Run it in the SQL Editor"
echo "4. Enable Email authentication in Authentication → Providers"
echo ""
echo "Ready to test? Run:"
echo "  cd frontend && npm run dev"
echo ""
echo "You can now log in with:"
echo "  • israel@monogoto.io"
echo "  • maor@monogoto.io"