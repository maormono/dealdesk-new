#!/usr/bin/env node

const SUPABASE_URL = 'https://uddmjjgnexdazfedrytt.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0'

// You'll need to get a valid user JWT token from the browser
// Go to Application → Local Storage → sb-uddmjjgnexdazfedrytt-auth-token in your browser dev tools
const USER_TOKEN = 'REPLACE_WITH_ACTUAL_TOKEN_FROM_BROWSER'

async function testInviteFunction() {
  console.log('Testing Edge Function...')
  
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
    
    const responseText = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', responseText)
    
    if (response.ok) {
      console.log('✅ Function works!')
    } else {
      console.log('❌ Function failed:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing function:', error.message)
  }
}

console.log('To test this function:')
console.log('1. Go to your browser where you\'re logged into DealDesk')
console.log('2. Open Developer Tools (F12)')
console.log('3. Go to Application/Storage → Local Storage')
console.log('4. Find "sb-uddmjjgnexdazfedrytt-auth-token"')
console.log('5. Copy the access_token value and replace USER_TOKEN above')
console.log('6. Run this script again')

if (USER_TOKEN !== 'REPLACE_WITH_ACTUAL_TOKEN_FROM_BROWSER') {
  testInviteFunction()
} else {
  console.log('\n⚠️  Please update USER_TOKEN first!')
}