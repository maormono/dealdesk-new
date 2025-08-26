// Mock Supabase for testing without actual Supabase setup
import { createClient } from '@supabase/supabase-js'

// Use dummy values if environment variables are not set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

export const ALLOWED_EMAILS = [
  'israel@monogoto.io',
  'maor@monogoto.io',
  'asaf@monogoto.io'
]

export const isEmailAllowed = (email: string): boolean => {
  return ALLOWED_EMAILS.includes(email.toLowerCase())
}

export const isDomainAllowed = (email: string): boolean => {
  return email.toLowerCase().endsWith('@monogoto.io')
}

// Mock user for testing
export const mockUser = {
  id: 'mock-user-id',
  email: 'maor@monogoto.io',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
}

// Mock session for testing
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser
}