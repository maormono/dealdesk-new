#!/bin/bash

# Fix DealDesk Auth Configuration Script
# This will open all the necessary Supabase pages to update settings

PROJECT_REF="uddmjjgnexdazfedrytt"
CORRECT_URL="https://deal-desk.netlify.app"

echo "🚀 DealDesk Auth Configuration Fixer"
echo "===================================="
echo ""
echo "✅ The CORRECT URL is: $CORRECT_URL"
echo "   (NOT dealdesk-monogoto.netlify.app)"
echo ""
echo "This script will open the Supabase pages you need to update."
echo ""
echo "Press Enter to continue..."
read

# Open URL Configuration page
echo "1️⃣ Opening URL Configuration page..."
echo "   Set Site URL to: $CORRECT_URL"
echo "   Add redirect URLs as shown in the SQL file"
open "https://app.supabase.com/project/$PROJECT_REF/auth/url-configuration"

echo ""
echo "Press Enter after updating URL Configuration..."
read

# Open Email Templates page
echo "2️⃣ Opening Email Templates page..."
echo "   Update ALL templates to use: $CORRECT_URL/auth/callback"
open "https://app.supabase.com/project/$PROJECT_REF/auth/templates"

echo ""
echo "Update each template with these URLs:"
echo ""
echo "📧 Invite User Template:"
echo "$CORRECT_URL/auth/callback?token_hash={{ .TokenHash }}&type=invite"
echo ""
echo "📧 Magic Link Template:"
echo "$CORRECT_URL/auth/callback?token_hash={{ .TokenHash }}&type=magiclink"
echo ""
echo "📧 Confirm Signup Template:"
echo "$CORRECT_URL/auth/callback?token_hash={{ .TokenHash }}&type=email"
echo ""
echo "📧 Reset Password Template:"
echo "$CORRECT_URL/auth/callback?token_hash={{ .TokenHash }}&type=recovery"
echo ""
echo "Press Enter after updating Email Templates..."
read

# Open SQL Editor
echo "3️⃣ Opening SQL Editor..."
echo "   Run the SQL from update-auth-config.sql"
open "https://app.supabase.com/project/$PROJECT_REF/sql/new"

echo ""
echo "Copy and run this SQL:"
cat update-auth-config.sql
echo ""
echo "Press Enter after running the SQL..."
read

# Test the site
echo "4️⃣ Testing the live site..."
open "$CORRECT_URL/user-management"

echo ""
echo "✅ Configuration update complete!"
echo ""
echo "You can now:"
echo "1. Go to User Management at $CORRECT_URL/user-management"
echo "2. Send an invitation"
echo "3. The email link should work correctly!"
echo ""
echo "The invitation URL will be:"
echo "$CORRECT_URL/auth/callback?token_hash=...&type=invite"