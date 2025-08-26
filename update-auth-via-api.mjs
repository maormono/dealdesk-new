#!/usr/bin/env node

// Update Supabase Auth Configuration via API
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const envPath = path.join(__dirname, 'frontend', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔧 Updating Supabase Auth Configuration...\n');
console.log('Supabase URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// SQL to update auth configuration
const updateSQL = `
-- Update Site URL
UPDATE auth.config 
SET value = 'https://deal-desk.netlify.app'
WHERE key = 'site_url';

-- Update URI Allow List
UPDATE auth.config
SET value = jsonb_build_array(
    'https://deal-desk.netlify.app',
    'https://deal-desk.netlify.app/',
    'https://deal-desk.netlify.app/*',
    'https://deal-desk.netlify.app/auth/callback',
    'https://deal-desk.netlify.app/auth/confirm',
    'http://localhost:5173',
    'http://localhost:5173/',
    'http://localhost:5173/*',
    'http://localhost:5173/auth/callback'
)::text
WHERE key = 'uri_allow_list';

-- Return the updated values
SELECT key, value FROM auth.config 
WHERE key IN ('site_url', 'uri_allow_list');
`;

async function updateAuthConfig() {
  try {
    console.log('📝 Executing SQL to update auth configuration...\n');
    
    // Note: This requires service role key to modify auth.config
    // Since we only have anon key, we'll create the SQL for manual execution
    
    console.log('⚠️  Note: Updating auth.config requires admin access.');
    console.log('The anon key cannot modify auth settings directly.\n');
    
    // Save SQL for manual execution
    fs.writeFileSync('final-auth-update.sql', updateSQL);
    console.log('✅ SQL saved to: final-auth-update.sql\n');
    
    // Generate email templates
    const emailTemplates = {
      "Invite User": `<h2>Welcome to DealDesk!</h2>
<p>You have been invited to join the DealDesk platform.</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=invite">Accept Invitation</a></p>`,
      
      "Magic Link": `<h2>Your Magic Link</h2>
<p>Click to sign in to DealDesk:</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Sign In</a></p>`,
      
      "Confirm Signup": `<h2>Confirm Your Email</h2>
<p>Please confirm your email for DealDesk:</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm Email</a></p>`,
      
      "Reset Password": `<h2>Reset Your Password</h2>
<p>Click to reset your DealDesk password:</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>`
    };
    
    // Save templates
    fs.writeFileSync('email-templates.json', JSON.stringify(emailTemplates, null, 2));
    console.log('📧 Email templates saved to: email-templates.json\n');
    
    // Create automated update script
    const autoScript = `#!/bin/bash
# Automated Supabase Auth Fix

echo "🚀 Automated Auth Configuration Update"
echo ""

# Get project ref from URL
PROJECT_REF="${SUPABASE_URL.split('.')[0].replace('https://', '')}"

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
`;

    fs.writeFileSync('auto-fix-auth.sh', autoScript);
    fs.chmodSync('auto-fix-auth.sh', '755');
    
    console.log('🤖 Automated script created: auto-fix-auth.sh');
    console.log('\n✅ To complete the update:');
    console.log('1. Run: ./auto-fix-auth.sh');
    console.log('2. This will open all necessary Supabase pages');
    console.log('3. Apply the changes as shown in the files\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAuthConfig();