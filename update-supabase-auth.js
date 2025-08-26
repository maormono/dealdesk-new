#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: './frontend/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PROJECT_REF = 'uddmjjgnexdazfedrytt';

// These need to be set via Supabase Management API
const CORRECT_SITE_URL = 'https://deal-desk.netlify.app';

console.log('🔧 Updating Supabase Auth Configuration...\n');
console.log('Project:', PROJECT_REF);
console.log('New Site URL:', CORRECT_SITE_URL);

// Create SQL to update auth configuration
const updateAuthConfigSQL = `
-- Update Site URL
UPDATE auth.config 
SET value = '${CORRECT_SITE_URL}'
WHERE key = 'site_url';

-- Update URI Allow List
UPDATE auth.config
SET value = jsonb_build_array(
    '${CORRECT_SITE_URL}',
    '${CORRECT_SITE_URL}/',
    '${CORRECT_SITE_URL}/*',
    '${CORRECT_SITE_URL}/auth/callback',
    '${CORRECT_SITE_URL}/auth/confirm',
    'http://localhost:5173',
    'http://localhost:5173/',
    'http://localhost:5173/*',
    'http://localhost:5173/auth/callback'
)::text
WHERE key = 'uri_allow_list';

-- Verify the changes
SELECT key, value FROM auth.config 
WHERE key IN ('site_url', 'uri_allow_list');
`;

// Save SQL file for manual execution
const fs = require('fs');
fs.writeFileSync('update-auth-config.sql', updateAuthConfigSQL);

console.log('\n✅ SQL file created: update-auth-config.sql');
console.log('\n📋 Next steps:');
console.log('1. Go to Supabase Dashboard: https://app.supabase.com/project/' + PROJECT_REF);
console.log('2. Navigate to SQL Editor');
console.log('3. Run the SQL from update-auth-config.sql');
console.log('\n4. Then update Email Templates:');
console.log('   - Go to Authentication → Email Templates');
console.log('   - Update each template with the correct URL');

// Email template examples
const emailTemplates = {
  invite: `<h2>Welcome to DealDesk!</h2>
<p>You have been invited to join the DealDesk platform.</p>
<p><a href="${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=invite" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=invite</p>`,

  magicLink: `<h2>Your Magic Link</h2>
<p>Click below to sign in to DealDesk:</p>
<p><a href="${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink</p>`,

  confirmSignup: `<h2>Confirm Your Email</h2>
<p>Please confirm your email address for DealDesk:</p>
<p><a href="${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=email" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm Email</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=email</p>`,

  resetPassword: `<h2>Reset Your Password</h2>
<p>Click below to reset your DealDesk password:</p>
<p><a href="${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=recovery" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>${CORRECT_SITE_URL}/auth/callback?token_hash={{ .TokenHash }}&type=recovery</p>`
};

// Save email templates
fs.writeFileSync('email-templates.json', JSON.stringify(emailTemplates, null, 2));

console.log('\n📧 Email templates saved to: email-templates.json');
console.log('\nCopy each template to the corresponding section in Supabase Dashboard.');
console.log('\n🎯 Direct link to update settings:');
console.log(`https://app.supabase.com/project/${PROJECT_REF}/auth/url-configuration`);
console.log(`https://app.supabase.com/project/${PROJECT_REF}/auth/templates`);