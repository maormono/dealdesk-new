#!/usr/bin/env node

const SUPABASE_URL = 'https://uddmjjgnexdazfedrytt.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc2NDY5NSwiZXhwIjoyMDYzMzQwNjk1fQ.-0iGZkdTXurAONrdzz8bPYL4yR3I5Hl0z92DxbuW76w'

async function updateEmailTemplate() {
  const newTemplate = `<h2>Welcome to DealDesk!</h2>
<p>You have been invited to join the DealDesk platform.</p>
<p><a href="https://deal-desk.netlify.app/auth/callback?token_hash={{ .Token }}&type=invite">Accept Invitation</a></p>`

  const config = {
    MAILER_TEMPLATES_INVITE: newTemplate,
  }

  try {
    // Try the auth config endpoint
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify(config)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Email template updated successfully!')
      console.log('The invite template now uses the correct {{ .Token }} variable.')
      console.log('Result:', result)
    } else {
      const error = await response.text()
      console.error('❌ Failed to update template:', response.status, error)
      
      // Try alternative endpoint
      console.log('Trying alternative endpoint...')
      const response2 = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY
        },
        body: JSON.stringify(config)
      })
      
      if (response2.ok) {
        console.log('✅ Email template updated via alternative endpoint!')
      } else {
        const error2 = await response2.text()
        console.error('❌ Alternative endpoint also failed:', response2.status, error2)
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

updateEmailTemplate()