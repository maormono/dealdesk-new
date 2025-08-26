#!/usr/bin/env node

// Test direct invitation using Supabase admin
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://uddmjjgnexdazfedrytt.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc2NDY5NSwiZXhwIjoyMDYzMzQwNjk1fQ.-0iGZkdTXurAONrdzz8bPYL4yR3I5Hl0z92DxbuW76w'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testDirectInvite() {
  const testEmail = 'test-new-user@monogoto.io'
  
  console.log('🧪 Testing direct invitation via Supabase Admin API...')
  console.log('Email:', testEmail)
  
  try {
    // Try to invite directly using admin API
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(testEmail, {
      redirectTo: 'https://deal-desk.netlify.app/auth/callback',
      data: {
        invited_by: 'test-script',
        invited_at: new Date().toISOString()
      }
    })
    
    if (error) {
      console.error('❌ Direct invitation failed:', error)
      
      if (error.message?.includes('already been registered')) {
        console.log('💡 User already exists - this is expected for existing emails')
        
        // Try with a different email
        const newEmail = `test-${Date.now()}@monogoto.io`
        console.log(`\n🔄 Trying with new email: ${newEmail}`)
        
        const { data: data2, error: error2 } = await supabase.auth.admin.inviteUserByEmail(newEmail, {
          redirectTo: 'https://deal-desk.netlify.app/auth/callback'
        })
        
        if (error2) {
          console.error('❌ Second attempt failed:', error2)
        } else {
          console.log('✅ Direct invitation succeeded!')
          console.log('User created:', data2?.user?.email)
        }
      }
    } else {
      console.log('✅ Direct invitation succeeded!')
      console.log('User created:', data?.user?.email)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDirectInvite()