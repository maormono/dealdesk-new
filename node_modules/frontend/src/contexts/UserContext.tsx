import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface UserRole {
  role: 'admin' | 'sales' | 'viewer'
  canSeeCosts: boolean
  canEditPricing: boolean
  canExportData: boolean
  markupPercentage: number
}

interface UserContextType {
  userRole: UserRole | null
  loading: boolean
  isAdmin: boolean
  isSales: boolean
  getPriceLabel: () => string
  formatPrice: (priceInCents: number, isActualCost?: boolean) => number
}

const defaultUserRole: UserRole = {
  role: 'viewer',
  canSeeCosts: false,
  canEditPricing: false,
  canExportData: false,
  markupPercentage: 50.0
}

const UserContext = createContext<UserContextType>({
  userRole: null,
  loading: true,
  isAdmin: false,
  isSales: false,
  getPriceLabel: () => 'Price',
  formatPrice: (price) => price
})

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Check if we're in dev mode
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setUserRole(null)
        setLoading(false)
        return
      }

      // In dev mode, default to admin
      if (isDevMode) {
        setUserRole({
          role: 'admin',
          canSeeCosts: true,
          canEditPricing: true,
          canExportData: true,
          markupPercentage: 0
        })
        setLoading(false)
        return
      }

      try {
        // Call the database function to get user role info
        console.log('Fetching user role for:', user.email)
        
        // First, try the RPC function
        const { data, error } = await supabase
          .rpc('get_user_role_info')
          .single()

        if (error) {
          console.error('Error fetching user role via RPC:', error)
          
          // Fallback: Try direct query to user_profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, can_see_costs, can_edit_pricing, can_export_data, markup_percentage')
            .eq('user_id', user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching user profile directly:', profileError)
            
            // Hardcoded admin check as last resort
            const adminEmails = ['maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io']
            if (adminEmails.includes(user.email || '')) {
              console.log('User is in admin list, setting admin role')
              setUserRole({
                role: 'admin',
                canSeeCosts: true,
                canEditPricing: true,
                canExportData: true,
                markupPercentage: 0
              })
            } else {
              setUserRole({
                ...defaultUserRole,
                role: 'sales'
              })
            }
          } else if (profileData) {
            console.log('User profile data from direct query:', profileData)
            setUserRole({
              role: profileData.role || 'sales',
              canSeeCosts: profileData.can_see_costs || false,
              canEditPricing: profileData.can_edit_pricing || false,
              canExportData: profileData.can_export_data || false,
              markupPercentage: profileData.markup_percentage || 50.0
            })
          }
        } else if (data) {
          console.log('User role data received from RPC:', data)
          setUserRole({
            role: (data as any).role || 'sales',
            canSeeCosts: (data as any).can_see_costs || false,
            canEditPricing: (data as any).can_edit_pricing || false,
            canExportData: (data as any).can_export_data || false,
            markupPercentage: (data as any).markup_percentage || 50.0
          })
        } else {
          console.log('No user role data found, checking admin list')
          // Hardcoded admin check
          const adminEmails = ['maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io']
          if (adminEmails.includes(user.email || '')) {
            setUserRole({
              role: 'admin',
              canSeeCosts: true,
              canEditPricing: true,
              canExportData: true,
              markupPercentage: 0
            })
          } else {
            setUserRole({
              ...defaultUserRole,
              role: 'sales'
            })
          }
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error)
        setUserRole({
          ...defaultUserRole,
          role: 'sales'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  const isAdmin = userRole?.role === 'admin'
  const isSales = userRole?.role === 'sales'

  const getPriceLabel = () => {
    if (!userRole) return 'Price'
    if (userRole.canSeeCosts) return 'Cost'
    return 'Customer Price'
  }

  const formatPrice = (priceInCents: number, isActualCost?: boolean): number => {
    if (!userRole || userRole.canSeeCosts || isActualCost) {
      return priceInCents
    }
    // Apply markup for sales users
    const markupMultiplier = 1 + (userRole.markupPercentage / 100)
    return Math.round(priceInCents * markupMultiplier)
  }

  const value = {
    userRole,
    loading,
    isAdmin,
    isSales,
    getPriceLabel,
    formatPrice
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}