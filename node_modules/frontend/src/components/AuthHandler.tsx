import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthHandler({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if there's an auth code in the URL
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const error = searchParams.get('error')
    
    // If any auth parameters exist, redirect to the auth callback handler
    if (code || token_hash || type || error) {
      // Preserve all query parameters when redirecting
      const queryString = searchParams.toString()
      navigate(`/auth/callback?${queryString}`, { replace: true })
    }
  }, [searchParams, navigate])

  return <>{children}</>
}