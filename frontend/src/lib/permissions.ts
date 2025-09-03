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

    // Check if user has access to Monogoto OS (viewer role or higher)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      console.log('No user profile found')
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
      // If user has Monogoto OS access, grant basic DealDesk access
      if (userProfile.role) {
        return {
          role: 'user' as AppPermission,
          canSeeCosts: false,
          canEditPricing: false,
          canExportData: true,
          canManageUsers: false
        }
      }
      return getDefaultPermissions()
    }

    // Check for explicit DealDesk permissions
    const { data: roleData, error: roleError } = await supabase
      .from('user_app_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('app_id', appData.id)
      .single()

    if (roleError || !roleData) {
      console.log('No explicit DealDesk permissions, using default based on Monogoto OS access')
      // If user has Monogoto OS access but no explicit DealDesk permissions,
      // grant basic user access
      if (userProfile.role) {
        return {
          role: 'user' as AppPermission,
          canSeeCosts: false,
          canEditPricing: false,
          canExportData: true,
          canManageUsers: false
        }
      }
      return getDefaultPermissions()
    }

    // Return explicit permissions based on role
    return {
      role: roleData.role as AppPermission,
      canSeeCosts: roleData.role === 'admin',
      canEditPricing: roleData.role === 'admin',
      canExportData: true,
      canManageUsers: roleData.role === 'admin'
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