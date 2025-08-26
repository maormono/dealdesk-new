// Development Auth Context - for testing without Supabase
import { createContext, useContext, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  isAuthorized: boolean
}

// Mock user for development
const mockUser: User = {
  id: 'dev-user-id',
  email: 'maor@monogoto.io',
  app_metadata: {},
  user_metadata: { full_name: 'Maor (Dev Mode)' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString()
} as User

const mockSession: Session = {
  access_token: 'dev-access-token',
  refresh_token: 'dev-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600
} as Session

const AuthContext = createContext<AuthContextType>({
  user: mockUser,
  session: mockSession,
  loading: false,
  signOut: async () => {},
  isAuthorized: true
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<User | null>(mockUser)
  const [session] = useState<Session | null>(mockSession)
  const [loading] = useState(false)
  const [isAuthorized] = useState(true)

  const signOut = async () => {
    console.log('Sign out clicked (dev mode - reload page to reset)')
    window.location.href = '/login'
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