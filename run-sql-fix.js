#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://uddmjjgnexdazfedrytt.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc2NDY5NSwiZXhwIjoyMDYzMzQwNjk1fQ.-0iGZkdTXurAONrdzz8bPYL4yR3I5Hl0z92DxbuW76w'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixIsraelAdmin() {
  console.log('🔍 Checking israel@monogoto.io admin status...')
  
  try {
    // First check current status
    const { data: currentStatus, error: checkError } = await supabase
      .from('user_profiles')
      .select('role, user_id, email')
      .eq('email', 'israel@monogoto.io')
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking status:', checkError)
      return
    }
    
    console.log('Current status:', currentStatus)
    
    // Get user ID from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      console.error('❌ Error getting users:', userError)
      return
    }
    
    const israelUser = userData.users.find(u => u.email === 'israel@monogoto.io')
    if (!israelUser) {
      console.error('❌ israel@monogoto.io not found in auth.users')
      return
    }
    
    console.log('Found israel user:', israelUser.id)
    
    // Insert or update user profile
    const { data: upsertData, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: israelUser.id,
        email: 'israel@monogoto.io',
        role: 'admin',
        can_see_costs: true,
        can_edit_pricing: true,
        can_export_data: true,
        markup_percentage: 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (upsertError) {
      console.error('❌ Error updating profile:', upsertError)
      return
    }
    
    console.log('✅ israel@monogoto.io is now admin!')
    console.log('Data:', upsertData)
    
    // Verify the fix
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('email', 'israel@monogoto.io')
      .single()
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError)
      return
    }
    
    console.log('✅ Verified:', verifyData)
    console.log('🎉 israel@monogoto.io can now invite users!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixIsraelAdmin()