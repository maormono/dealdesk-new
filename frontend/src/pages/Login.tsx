import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase, isEmailAllowed } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import monogotoLogo from '../assets/monogoto-logo.svg'
import { Shield, Globe, Zap, Lock } from 'lucide-react'

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        const email = session.user.email
        
        if (!isEmailAllowed(email)) {
          setError('Access denied. Your email is not in the allowed list.')
          await supabase.auth.signOut()
          return
        }
        
        navigate('/')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={monogotoLogo} alt="Monogoto Logo" className="h-20 w-auto filter drop-shadow-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">DealDesk</h1>
          <p className="text-blue-200 text-lg">Operator Pricing Intelligence Platform</p>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center text-blue-300 text-sm">
              <Globe className="w-4 h-4 mr-1" />
              <span>Global</span>
            </div>
            <div className="flex items-center text-blue-300 text-sm">
              <Zap className="w-4 h-4 mr-1" />
              <span>Real-time</span>
            </div>
            <div className="flex items-center text-blue-300 text-sm">
              <Shield className="w-4 h-4 mr-1" />
              <span>Secure</span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
              <p className="text-red-700 text-sm flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}

          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 text-sm font-semibold mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Secure Access Control
              </p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Monogoto.io domain required</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Authorized users only</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Enterprise SSO available</span>
                </li>
              </ul>
            </div>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                    brandButtonText: 'white',
                    defaultButtonBackground: '#ffffff',
                    defaultButtonBackgroundHover: '#f9fafb',
                    defaultButtonBorder: '#e5e7eb',
                    defaultButtonText: '#374151',
                    dividerBackground: '#e5e7eb',
                    inputBackground: '#ffffff',
                    inputBorder: '#d1d5db',
                    inputBorderHover: '#9ca3af',
                    inputBorderFocus: '#3b82f6',
                    inputText: '#1f2937',
                    inputLabelText: '#4b5563',
                    inputPlaceholder: '#9ca3af',
                    messageText: '#1f2937',
                    messageTextDanger: '#dc2626',
                    anchorTextColor: '#3b82f6',
                    anchorTextHoverColor: '#2563eb',
                  },
                  space: {
                    spaceSmall: '4px',
                    spaceMedium: '8px',
                    spaceLarge: '16px',
                    labelBottomMargin: '8px',
                    anchorBottomMargin: '4px',
                    emailInputSpacing: '4px',
                    socialAuthSpacing: '4px',
                    buttonPadding: '12px 16px',
                    inputPadding: '12px 16px',
                  },
                  fontSizes: {
                    baseBodySize: '14px',
                    baseInputSize: '14px',
                    baseLabelSize: '14px',
                    baseButtonSize: '14px',
                  },
                  fonts: {
                    bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                    buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                    inputFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                    labelFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    buttonBorderRadius: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                },
              },
              className: {
                container: 'w-full',
                button: 'w-full px-4 py-3 font-medium transition-all duration-200 transform hover:scale-[1.02]',
                input: 'w-full px-4 py-3',
                label: 'text-gray-700 font-medium mb-2',
                divider: 'my-6',
                anchor: 'text-blue-600 hover:text-blue-700 font-medium transition-colors',
                message: 'text-sm mb-4 p-3 rounded-lg',
              },
            }}
            providers={['google']}
            redirectTo={import.meta.env.VITE_SITE_URL || window.location.origin}
            onlyThirdPartyProviders={false}
            magicLink={true}
            showLinks={true}
            view="sign_in"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email Address',
                  password_label: 'Password',
                  email_input_placeholder: 'your.name@monogoto.io',
                  password_input_placeholder: 'Enter your password',
                  button_label: 'Sign In',
                  loading_button_label: 'Signing in...',
                  social_provider_text: 'Sign in with {{provider}}',
                  link_text: "Don't have an account? Sign up",
                },
                sign_up: {
                  email_label: 'Email Address',
                  password_label: 'Create Password',
                  email_input_placeholder: 'your.name@monogoto.io',
                  password_input_placeholder: 'Create a strong password',
                  button_label: 'Sign Up',
                  loading_button_label: 'Creating account...',
                  social_provider_text: 'Sign up with {{provider}}',
                  link_text: 'Already have an account? Sign in',
                },
                magic_link: {
                  email_input_label: 'Email Address',
                  email_input_placeholder: 'your.name@monogoto.io',
                  button_label: 'Send Magic Link',
                  loading_button_label: 'Sending magic link...',
                  link_text: 'Send a magic link email',
                },
                forgotten_password: {
                  email_label: 'Email Address',
                  email_input_placeholder: 'your.name@monogoto.io',
                  button_label: 'Send Reset Instructions',
                  loading_button_label: 'Sending reset instructions...',
                  link_text: 'Forgot your password?',
                },
              },
            }}
          />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to Monogoto's Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-blue-200">
            Need access? Contact{' '}
            <a href="mailto:israel@monogoto.io" className="text-white hover:text-blue-200 font-medium transition-colors">
              israel@monogoto.io
            </a>
          </p>
          <div className="mt-4 flex items-center justify-center text-xs text-blue-300">
            <Lock className="w-3 h-3 mr-1" />
            <span>Enterprise-grade Security • SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  )
}