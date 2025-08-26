// Quick script to check Supabase setup
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuth() {
  console.log('🔍 Checking Supabase Authentication Setup...\n');
  
  // Check if allowed_users table exists
  const { data: tables, error } = await supabase
    .from('allowed_users')
    .select('*')
    .limit(5);
  
  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ allowed_users table does not exist');
      console.log('   Run the setup SQL to create it');
    } else {
      console.log('⚠️ Error checking allowed_users:', error.message);
    }
  } else {
    console.log('✅ allowed_users table exists');
    console.log('   Current allowed users:', tables);
  }
  
  // Test authentication
  console.log('\n📧 Testing authentication...');
  const { data: authData, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.log('❌ Auth error:', authError.message);
  } else {
    console.log('✅ Auth is configured');
    console.log('   Current session:', authData.session ? 'Active' : 'None');
  }
  
  console.log('\n🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 Using project: uddmjjgnexdazfedrytt');
}

checkAuth().catch(console.error);