import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../contexts/UserContext'
import { AccessDenied } from '../pages/AccessDenied'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, isAuthorized } = useAuth()
  const { userRole, loading: userLoading, permissionsFetched } = useUser()

  if (authLoading || userLoading || (user && !permissionsFetched)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAuthorized) {
    return <Navigate to="/login" replace />
  }

  // Check if user has DealDesk permissions
  if (!userRole) {
    return <AccessDenied />
  }

  return <>{children}</>
}