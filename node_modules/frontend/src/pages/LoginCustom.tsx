import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase, isEmailAllowed } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import monogotoLogo from '../assets/monogoto-logo.svg';
import { Shield, Globe, Zap, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

// Check if we're in dev mode
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

export default function LoginCustom() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // In dev mode, auto-redirect to home
    if (isDevMode) {
      navigate('/');
      return;
    }

    // Check if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        if (isEmailAllowed(session.user.email)) {
          navigate('/');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('Attempting login for:', email);

    try {
      // Check if email is allowed
      if (!isEmailAllowed(email)) {
        setError('Access denied. Only @monogoto.io email addresses are allowed.');
        setLoading(false);
        return;
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        // Check if it's an invalid credentials error
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account.');
        } else if (error.message.includes('Invalid API key')) {
          setError('Configuration error. Please contact administrator.');
          console.error('Supabase configuration issue - check environment variables');
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!isEmailAllowed(email)) {
        setError('Access denied. Only @monogoto.io email addresses are allowed.');
        setLoading(false);
        return;
      }

      // Use the configured site URL or fall back to current origin
      const redirectUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setError(null);
        alert('Check your email for the magic link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-blue-200 text-lg tracking-wide">Operator Pricing Intelligence Platform</p>
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
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@monogoto.io"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading || !email}
              className="mt-4 w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Magic Link
            </button>
          </div>

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
  );
}