// Test Supabase Auth Flow
// Run with: node test-auth-flow.js

const { createClient } = require('@supabase/supabase-js');

// Get these from your .env file
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing Supabase Auth Configuration...\n');
  
  // Test 1: Check if we can connect
  console.log('1. Testing connection to Supabase...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.log('   ❌ Not authenticated (this is expected)');
  } else if (user) {
    console.log('   ✅ Authenticated as:', user.email);
  }
  
  // Test 2: Check redirect URL configuration
  console.log('\n2. Testing OTP email flow...');
  const testEmail = 'test-' + Date.now() + '@monogoto.io';
  console.log('   Attempting to send OTP to:', testEmail);
  
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: testEmail,
    options: {
      emailRedirectTo: 'https://dealdesk-monogoto.netlify.app/auth/callback',
      data: {
        test: true
      }
    }
  });
  
  if (otpError) {
    console.log('   ❌ OTP Error:', otpError.message);
    console.log('   Error details:', otpError);
  } else {
    console.log('   ✅ OTP request sent successfully');
    console.log('   Check the email for the redirect URL format');
  }
  
  // Test 3: List existing users
  console.log('\n3. Checking existing users (requires admin)...');
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('email, role')
    .limit(5);
  
  if (usersError) {
    console.log('   ❌ Cannot fetch users:', usersError.message);
  } else {
    console.log('   ✅ Found', users?.length || 0, 'user profiles');
    users?.forEach(u => console.log('      -', u.email, '(', u.role, ')'));
  }
  
  console.log('\n4. Configuration recommendations:');
  console.log('   - Site URL should be: https://dealdesk-monogoto.netlify.app');
  console.log('   - Redirect URLs should include:');
  console.log('     * https://dealdesk-monogoto.netlify.app');
  console.log('     * https://dealdesk-monogoto.netlify.app/*');
  console.log('     * https://dealdesk-monogoto.netlify.app/auth/callback');
  console.log('   - Email template should use: {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite');
}

testAuth().catch(console.error);