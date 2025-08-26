#!/bin/bash
# Automated Supabase Auth Fix

echo "🚀 Automated Auth Configuration Update"
echo ""

# Get project ref from URL
PROJECT_REF="uddmjjgnexdazfedrytt"

echo "Project Reference: $PROJECT_REF"
echo ""

# Step 1: Open URL config
echo "Step 1: Opening URL Configuration..."
open "https://app.supabase.com/project/$PROJECT_REF/auth/url-configuration"
sleep 3

# Step 2: Open email templates
echo "Step 2: Opening Email Templates..."
open "https://app.supabase.com/project/$PROJECT_REF/auth/templates"
sleep 3

# Step 3: Open SQL editor with query
echo "Step 3: Opening SQL Editor..."
open "https://app.supabase.com/project/$PROJECT_REF/sql/new"

echo ""
echo "✅ All pages opened. Please:"
echo "1. Set Site URL to: https://deal-desk.netlify.app"
echo "2. Update all email templates with the templates in email-templates.json"
echo "3. Run the SQL from final-auth-update.sql"
