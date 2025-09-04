import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isEmailAllowed } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  isAuthorized: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isAuthorized: false
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Check if we're in dev mode
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'

// Mock user for dev mode
const mockDevUser: User = {
  id: 'dev-user-123',
  email: 'maor@monogoto.io',
  app_metadata: {},
  user_metadata: { full_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString()
} as User

const mockDevSession: Session = {
  access_token: 'dev-token',
  refresh_token: 'dev-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockDevUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600
} as Session

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(isDevMode ? mockDevUser : null)
  const [session, setSession] = useState<Session | null>(isDevMode ? mockDevSession : null)
  const [loading, setLoading] = useState(!isDevMode)
  const [isAuthorized, setIsAuthorized] = useState(isDevMode)

  useEffect(() => {
    // Skip Supabase setup in dev mode
    if (isDevMode) {
      console.log('🔧 Dev Mode Active - Authentication bypassed')
      console.log('📧 Logged in as: maor@monogoto.io')
      return
    }

    let mounted = true

    async function getInitialSession() {
      try {
        // First check for SSO tokens from Monogoto OS in URL parameters
        const params = new URLSearchParams(window.location.search)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const expiresAt = params.get('expires_at')
        
        if (accessToken && refreshToken) {
          console.log('SSO tokens found in URL, setting session from Monogoto OS...')
          
          try {
            // Set the session using the tokens from Monogoto OS
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (error) throw error
            
            if (data.session && mounted) {
              console.log('SSO session set successfully for:', data.session.user.email)
              
              // Clean URL (remove tokens from address bar for security)
              window.history.replaceState({}, document.title, window.location.pathname)
              
              // Set the session in our state
              setSession(data.session)
              setUser(data.session.user)
              setIsAuthorized(true)
              setLoading(false)
              return // Exit early, we're done
            }
          } catch (ssoError) {
            console.error('SSO login failed:', ssoError)
            // Fall through to check for existing session
          }
        }
        
        // No SSO tokens, check for existing Supabase session (from previous login)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        if (mounted) {
          if (session?.user) {
            console.log('Found existing Supabase session for:', session.user.email)
            const email = session.user.email || ''
            
            // For SSO from Monogoto OS, we trust the session
            // The user already passed authentication there
            setSession(session)
            setUser(session.user)
            setIsAuthorized(true)
            
            // Only check email restrictions for direct logins
            // (not needed for SSO as Monogoto OS handles permissions)
            if (!isEmailAllowed(email)) {
              console.warn('User email not in allowed list, but has valid session:', email)
              // Still allow access as they have a valid Supabase session
              // Monogoto OS manages permissions
            }
          } else {
            console.log('No existing session found')
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Only set up auth listener in production mode
    if (!isDevMode) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (mounted) {
          if (session?.user) {
            // For SSO, trust the session from Monogoto OS
            setSession(session)
            setUser(session.user)
            setIsAuthorized(true)
            
            const email = session.user.email || ''
            if (!isEmailAllowed(email)) {
              console.warn('User email not in allowed list, but has valid session:', email)
              // Still allow access for SSO users
            }
          } else {
            setSession(null)
            setUser(null)
            setIsAuthorized(false)
          }
          setLoading(false)
        }
      })

      return () => {
        mounted = false
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  const signOut = async () => {
    try {
      if (isDevMode) {
        console.log('Sign out in dev mode - refreshing page')
        window.location.href = '/'
      } else {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setIsAuthorized(false)
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut,
    isAuthorized
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}