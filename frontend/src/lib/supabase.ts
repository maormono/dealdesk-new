import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
})

export const ALLOWED_EMAILS = [
  'israel@monogoto.io',
  'maor@monogoto.io',
  'asaf@monogoto.io'
]

export const isEmailAllowed = (email: string): boolean => {
  // Allow any @monogoto.io email address
  return isDomainAllowed(email)
}

export const isDomainAllowed = (email: string): boolean => {
  return email.toLowerCase().endsWith('@monogoto.io')
}