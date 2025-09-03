import { useState, useEffect } from 'react';
import { supabase, isDomainAllowed } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function LoginSimple() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [mode, setMode] = useState<'signin' | 'reset' | 'set-password'>('signin');
  const [checkingSession, setCheckingSession] = useState(true);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // First check if user already has a session
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // User is already logged in, redirect to home
          navigate('/', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [navigate]);

  useEffect(() => {
    // Check for auth codes in URL
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      if (error) {
        setMessage({ type: 'error', text: error_description || 'Authentication error' });
        return;
      }

      if (code) {
        // Handle magic link
        setLoading(true);
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          
          if (data.session) {
            setMessage({ type: 'success', text: 'Successfully logged in! Redirecting...' });
            setTimeout(() => navigate('/'), 1500);
          }
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message });
        } finally {
          setLoading(false);
        }
      } else if (token_hash && type === 'recovery') {
        // Handle password reset
        setMode('set-password');
        setMessage({ type: 'success', text: 'Please set your new password' });
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDomainAllowed(email)) {
      setMessage({ type: 'error', text: 'Only @monogoto.io email addresses are allowed' });
      return;
    }

    setLoading(true);
    setMessage({ type: null, text: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      if (data.session) {
        setMessage({ type: 'success', text: 'Logged in successfully! Redirecting...' });
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    if (!isDomainAllowed(email)) {
      setMessage({ type: 'error', text: 'Only @monogoto.io email addresses are allowed' });
      return;
    }

    setLoading(true);
    setMessage({ type: null, text: '' });

    try {
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Magic link sent! Check your email.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    if (!isDomainAllowed(email)) {
      setMessage({ type: 'error', text: 'Only @monogoto.io email addresses are allowed' });
      return;
    }

    setLoading(true);
    setMessage({ type: null, text: '' });

    try {
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`,
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password reset link sent! Check your email.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: null, text: '' });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password updated! Redirecting...' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking for existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DealDesk</h1>
          <p className="text-gray-600">Monogoto Pricing Platform</p>
        </div>

        {/* Message Display */}
        {message.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-start ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="name@monogoto.io"
                    required
                  />
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                    required
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Send Magic Link
              </button>

              <button
                onClick={() => setMode('reset')}
                className="w-full text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot Password?
              </button>
            </div>
          </>
        )}

        {/* Password Reset Form */}
        {mode === 'reset' && (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="name@monogoto.io"
                    required
                  />
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <button
                onClick={() => setMode('signin')}
                className="w-full text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* Set New Password Form */}
        {mode === 'set-password' && (
          <>
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Set New Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}