import { supabase } from './supabase'

export type AppPermission = 'admin' | 'user' | null

export interface DealDeskPermissions {
  role: AppPermission
  canSeeCosts: boolean
  canEditPricing: boolean
  canExportData: boolean
  canManageUsers: boolean
}

export async function getUserDealDeskPermissions(userId: string): Promise<DealDeskPermissions> {
  try {
    // First check if user has a valid session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.log('No active session found')
      return getDefaultPermissions()
    }

    // Get the DealDesk app ID
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('name', 'dealdesk')
      .single()

    if (appError || !appData) {
      console.error('Error fetching DealDesk app:', appError)
      // If no DealDesk app entry exists, grant basic access to authenticated users
      // This allows for development/testing
      return {
        role: 'user' as AppPermission,
        canSeeCosts: true,
        canEditPricing: false,
        canExportData: true,
        canManageUsers: false
      }
    }

    // Check for explicit DealDesk permissions in user_app_roles
    const { data: roleData, error: roleError } = await supabase
      .from('user_app_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('app_id', appData.id)
      .single()

    if (roleError || !roleData) {
      console.log('No explicit DealDesk permissions found')
      // Check if user has ANY role in user_app_roles (for any app)
      // This indicates they're a valid Monogoto OS user
      const { data: anyRole } = await supabase
        .from('user_app_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .single()
      
      if (anyRole) {
        console.log('User has Monogoto OS access, granting basic DealDesk access')
        // User has access to Monogoto OS, grant basic DealDesk access
        return {
          role: 'user' as AppPermission,
          canSeeCosts: true,
          canEditPricing: false,
          canExportData: true,
          canManageUsers: false
        }
      }
      
      // No permissions at all
      return getDefaultPermissions()
    }

    // Return explicit permissions based on role
    const isAdmin = roleData.role === 'admin' || roleData.role === 'sales_admin'
    return {
      role: isAdmin ? 'admin' : 'user' as AppPermission,
      canSeeCosts: true,
      canEditPricing: isAdmin,
      canExportData: true,
      canManageUsers: isAdmin
    }
  } catch (error) {
    console.error('Error fetching DealDesk permissions:', error)
    return getDefaultPermissions()
  }
}

function getDefaultPermissions(): DealDeskPermissions {
  return {
    role: null,
    canSeeCosts: false,
    canEditPricing: false,
    canExportData: false,
    canManageUsers: false
  }
}