import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`${new Date().toISOString()} - Received ${req.method} request`)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Environment variables check:')
    console.log('- SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'SET' : 'MISSING')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'MISSING')
    console.log('- SUPABASE_ANON_KEY:', Deno.env.get('SUPABASE_ANON_KEY') ? 'SET' : 'MISSING')

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create Supabase client with user's token to verify they're an admin
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      console.log('No authorization header found')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)
    
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is authenticated
    console.log('Verifying user authentication...')
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    
    if (userError) {
      console.error('User verification error:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!user) {
      console.log('No user found from token')
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Authenticated user:', user.email)

    // Check if user is admin
    console.log('Checking admin status...')
    const { data: profile, error: profileError } = await supabaseUser
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Profile check error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status', details: profileError.message }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User profile:', profile)

    if (!profile || profile.role !== 'admin') {
      console.log('User is not admin. Role:', profile?.role)
      return new Response(
        JSON.stringify({ error: 'Only admins can invite users', userRole: profile?.role }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Admin verification passed')

    // Get the email from request body
    const requestBody = await req.text()
    console.log('Request body:', requestBody)
    
    const { email, redirectTo } = JSON.parse(requestBody)
    console.log('Parsed email:', email)
    console.log('Parsed redirectTo:', redirectTo)

    if (!email) {
      console.log('Email is missing from request')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify email domain
    if (!email.endsWith('@monogoto.io')) {
      console.log('Invalid email domain:', email)
      return new Response(
        JSON.stringify({ error: 'Only @monogoto.io email addresses are allowed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('About to call admin.inviteUserByEmail...')

    // Use admin API to invite the user
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectTo || 'https://deal-desk.netlify.app/auth/callback',
        data: {
          invited_by: user.email,
          invited_at: new Date().toISOString()
        }
      }
    )

    if (inviteError) {
      console.error('Invitation error:', inviteError)
      
      // Check if user already exists
      if (inviteError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'User already exists', 
            message: 'This email is already registered. They can use the password reset option to access their account.'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: inviteError.message || 'Failed to send invitation', details: inviteError }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Invitation sent successfully:', inviteData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        user: inviteData.user
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack,
        type: error.constructor.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})