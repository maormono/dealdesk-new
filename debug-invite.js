#!/usr/bin/env node

// This script will help debug the invite function by making a direct request
const SUPABASE_URL = 'https://uddmjjgnexdazfedrytt.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0'

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function directly...')
  
  // Test without authentication first (should fail)
  console.log('\n1. Testing without auth (should fail):')
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        email: 'test@monogoto.io'
      })
    })
    
    const result = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', result)
    
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  console.log('\n2. To test with authentication:')
  console.log('- Open your DealDesk app in browser')
  console.log('- Open Developer Tools (F12)')
  console.log('- Go to Application → Local Storage')
  console.log('- Find "sb-uddmjjgnexdazfedrytt-auth-token"')
  console.log('- Copy the "access_token" value')
  console.log('- Replace TOKEN_HERE in the next part')
  
  // You need to manually set this token from browser
  const USER_TOKEN = 'TOKEN_HERE'
  
  if (USER_TOKEN === 'TOKEN_HERE') {
    console.log('\n⚠️  Set USER_TOKEN from browser to test authenticated request')
    return
  }
  
  console.log('\n3. Testing with authentication:')
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json',
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        email: 'test@monogoto.io',
        redirectTo: 'https://deal-desk.netlify.app/auth/callback'
      })
    })
    
    const result = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', result)
    
    if (response.ok) {
      console.log('✅ Invitation should work!')
    } else {
      console.log('❌ Still failing. Check the error above.')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testEdgeFunction()