import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, CheckCircle, XCircle, Lock } from 'lucide-react'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'password'>('loading')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback - Current URL:', window.location.href)
        console.log('AuthCallback - Search params:', Object.fromEntries(searchParams))
        
        // Check if we have tokens in the URL hash (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const hashType = hashParams.get('type')
        
        console.log('Hash params:', Object.fromEntries(hashParams))
        
        // Get query parameters
        const type = searchParams.get('type')
        const token_hash = searchParams.get('token_hash')
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')
        
        console.log('Type:', type || hashType)
        console.log('Token hash:', token_hash)
        console.log('Access token from hash:', accessToken)
        
        // Check for errors first
        if (error) {
          setStatus('error')
          setMessage(error_description || 'An error occurred during authentication')
          return
        }
        
        // Handle implicit flow with tokens in hash
        if (accessToken) {
          // Set the session with the tokens from the hash
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          
          if (!sessionError && data.session) {
            // Check the type to determine what to do
            if (hashType === 'recovery' || type === 'recovery') {
              // Password recovery - show password form
              setStatus('password')
              setMessage('Please enter your new password.')
            } else if (hashType === 'invite' || type === 'invite') {
              // Invitation - show password form to set initial password
              setStatus('password')
              setMessage('Welcome! Please set your password.')
            } else if (hashType === 'magiclink' || hashType === 'email' || type === 'magiclink' || type === 'email') {
              // Magic link or email confirmation - redirect to home
              setStatus('success')
              setMessage('Successfully logged in! Redirecting...')
              setTimeout(() => navigate('/'), 1500)
            } else {
              // Default case - user is authenticated, redirect to home
              setStatus('success')
              setMessage('Successfully authenticated! Redirecting...')
              setTimeout(() => navigate('/'), 1500)
            }
          } else {
            setStatus('error')
            setMessage(sessionError?.message || 'Failed to establish session')
          }
          return
        }
        
        // Handle token_hash flow (for invites and older recovery links)
        if (token_hash && type) {
          if (type === 'recovery') {
            // Try to verify the recovery token
            try {
              const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash,
                type: 'recovery'
              })
              
              if (!verifyError && data.session) {
                setStatus('password')
                setMessage('Please enter your new password.')
              } else {
                setStatus('error')
                setMessage(verifyError?.message || 'Invalid recovery link')
              }
            } catch (err: any) {
              setStatus('error')
              setMessage('Invalid or expired recovery link. Please request a new one.')
            }
            return
          } else if (type === 'invite') {
            // Handle invite flow with token_hash
            if (!token_hash) {
              setStatus('error')
              setMessage('Invalid invitation link. Please contact your administrator.')
              return
            }
            
            try {
              const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash,
                type: 'invite'
              })
              
              if (!verifyError && data.session) {
                setStatus('password')
                setMessage('Welcome! Please set your password.')
              } else {
                setStatus('error')
                setMessage(verifyError?.message || 'Invalid invitation link')
              }
            } catch (err: any) {
              setStatus('error')
              setMessage('Invalid or expired invitation. Please contact your administrator.')
            }
            return
          } else if (type === 'signup' || type === 'email' || type === 'magiclink') {
            // Email confirmation
            if (!token_hash) {
              setStatus('error')
              setMessage('Invalid verification link. Please request a new one.')
              return
            }
            
            const { error } = await supabase.auth.verifyOtp({
              token_hash,
              type: 'email',
            })

            if (error) {
              setStatus('error')
              setMessage(error.message)
            } else {
              setStatus('success')
              setMessage('Email confirmed successfully! Redirecting to login...')
              setTimeout(() => navigate('/login'), 2000)
            }
            return
          }
        }
        
        // Check if we already handled the hash params above
        if (accessToken && hashType) {
          // Already handled in the implicit flow section above
          return
        }

        if (!token_hash && !type) {
          // Check if this is a recovery flow with different params
          const access_token = searchParams.get('access_token')
          const refresh_token = searchParams.get('refresh_token')
          
          if (access_token && refresh_token && type === 'recovery') {
            // Direct recovery flow
            setStatus('password')
            setMessage('Please enter your new password.')
            return
          }
          
          setStatus('error')
          setMessage('Invalid authentication link. Please request a new one.')
          return
        }

        // Handle different auth types
        if (type === 'invite' || type === 'recovery') {
          // For invite and password recovery, show password form
          setStatus('password')
          setMessage(type === 'invite' ? 'Welcome! Please set your password.' : 'Please enter your new password.')
        } else if (type === 'signup' || type === 'email' || type === 'magiclink') {
          // Email confirmation
          if (!token_hash) {
            setStatus('error')
            setMessage('Invalid verification link. Please request a new one.')
            return
          }
          
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email',
          })

          if (error) {
            setStatus('error')
            setMessage(error.message)
          } else {
            setStatus('success')
            setMessage('Email confirmed successfully! Redirecting to login...')
            setTimeout(() => navigate('/login'), 2000)
          }
        } else {
          // Handle other types
          setStatus('error')
          setMessage(`Unsupported authentication type: ${type}`)
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'An unexpected error occurred')
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSetPassword called with password length:', password.length)
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setIsSettingPassword(true)
    setMessage('') // Clear any previous message
    
    try {
      // If we're showing the password form, we must have a valid session
      // Just try to update the password directly
      console.log('Attempting to update password...')
      
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session found:', !!session)
      
      if (session) {
        // We have a session, update the password
        console.log('Updating password...')
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        })

        if (updateError) {
          console.error('Password update error:', updateError)
          setMessage(updateError.message)
          setIsSettingPassword(false)
        } else {
          console.log('Password updated successfully!')
          
          // Check if this is an invitation (first time setup)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const hashType = hashParams.get('type')
          const queryType = searchParams.get('type')
          
          if (hashType === 'invite' || queryType === 'invite') {
            setStatus('success')
            setMessage('Account setup complete! Redirecting to login...')
            // Sign out so they can log in with their new password
            await supabase.auth.signOut()
            setTimeout(() => navigate('/login'), 2000)
          } else {
            setStatus('success')
            setMessage('Password updated successfully! Redirecting...')
            setTimeout(() => navigate('/'), 2000)
          }
        }
      } else {
        // No session found
        console.log('No session found')
        setMessage('Session expired. Please request a new link.')
        setIsSettingPassword(false)
      }
    } catch (err: any) {
      console.error('Error in handleSetPassword:', err)
      setMessage(err.message || 'Failed to set password')
      setIsSettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Status Icons and Messages */}
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing...</h2>
              <p className="text-gray-600">Please wait while we verify your request.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Success!</h2>
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
              <p className="text-red-600 mb-4">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {status === 'password' && (
            <div>
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Set Your Password</h2>
                <p className="text-gray-600">{message}</p>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                </div>

                {message && status === 'password' && (
                  <p className="text-red-600 text-sm">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={isSettingPassword}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Setting Password...
                    </>
                  ) : (
                    'Set Password'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}