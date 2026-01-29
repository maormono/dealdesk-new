import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getUserDealDeskPermissions, type DealDeskPermissions } from '../lib/permissions'

export interface UserRole {
  role: 'admin' | 'sales' | 'viewer'
  canSeeCosts: boolean
  canSeeHiddenNetworks: boolean
  canEditPricing: boolean
  canExportData: boolean
  markupPercentage: number
}

interface UserContextType {
  userRole: UserRole | null
  loading: boolean
  permissionsFetched: boolean
  isAdmin: boolean
  isSales: boolean
  getPriceLabel: () => string
  formatPrice: (priceInCents: number, isActualCost?: boolean) => number
}

const defaultUserRole: UserRole = {
  role: 'viewer',
  canSeeCosts: false,
  canSeeHiddenNetworks: false,
  canEditPricing: false,
  canExportData: false,
  markupPercentage: 50.0
}

const UserContext = createContext<UserContextType>({
  userRole: null,
  loading: true,
  permissionsFetched: false,
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
  const [permissionsFetched, setPermissionsFetched] = useState(false)
  const [lastUserId, setLastUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setUserRole(null)
        setLoading(false)
        setLastUserId(null)
        return
      }

      // Only refetch if user actually changed (not just auth token refresh)
      if (user.id === lastUserId && permissionsFetched) {
        return
      }

      // Only show loading if this is a new user (not a token refresh)
      if (user.id !== lastUserId) {
        setLoading(true)
        setPermissionsFetched(false)
      }

      // In dev mode, default to admin
      if (isDevMode) {
        setUserRole({
          role: 'admin',
          canSeeCosts: true,
          canSeeHiddenNetworks: true,
          canEditPricing: true,
          canExportData: true,
          markupPercentage: 0
        })
        setLoading(false)
        setLastUserId(user.id)
        return
      }

      try {
        console.log('Fetching DealDesk permissions for user:', user.email)
        
        // Get permissions from the user_app_roles table
        const permissions = await getUserDealDeskPermissions(user.id)
        
        console.log('DealDesk permissions:', permissions)
        
        // If user has no DealDesk access, deny access
        if (!permissions.role) {
          console.log('User has no DealDesk access')
          setUserRole(null)
          setLoading(false)
          return
        }
        
        // Map DealDesk permissions to UserRole
        // Admin: costs=true, hidden_networks=true, export=true, markup=0
        // Sales: costs=false, hidden_networks=false, export=true, markup=50
        // Viewer: costs=false, hidden_networks=false, export=false, markup=50
        const mappedRole: UserRole = {
          role: permissions.role === 'admin' ? 'admin' : 'sales',
          canSeeCosts: permissions.canSeeCosts,
          canSeeHiddenNetworks: permissions.role === 'admin',
          canEditPricing: permissions.canEditPricing,
          canExportData: permissions.canExportData,
          markupPercentage: permissions.canSeeCosts ? 0 : 50.0
        }
        
        setUserRole(mappedRole)
      } catch (error) {
        console.error('Error in fetchUserRole:', error)
        setUserRole(null)
      } finally {
        setLoading(false)
        setPermissionsFetched(true)
        setLastUserId(user.id)
      }
    }

    fetchUserRole()
  }, [user, lastUserId, permissionsFetched])

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
    permissionsFetched,
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