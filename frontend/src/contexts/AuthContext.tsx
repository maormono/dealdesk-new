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
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            const email = session.user.email || ''
            if (isEmailAllowed(email)) {
              setSession(session)
              setUser(session.user)
              setIsAuthorized(true)
            } else {
              await supabase.auth.signOut()
              setSession(null)
              setUser(null)
              setIsAuthorized(false)
            }
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
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (mounted) {
          if (session?.user) {
            const email = session.user.email || ''
            if (isEmailAllowed(email)) {
              setSession(session)
              setUser(session.user)
              setIsAuthorized(true)
            } else {
              await supabase.auth.signOut()
              setSession(null)
              setUser(null)
              setIsAuthorized(false)
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