import { Link } from 'react-router-dom'
import { ShieldOff, Home } from 'lucide-react'

// Get Monogoto OS URL from environment or use default
const MONOGOTO_OS_URL = import.meta.env.VITE_MONOGOTO_OS_URL || 'https://monogotoos.netlify.app'

export function AccessDenied() {
  return (
    <div className="bg-gray-50 pt-20 flex-1 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldOff className="w-12 h-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          You don't have permission to access DealDesk. Please contact your administrator to request access.
        </p>
        
        <div className="space-y-4">
          <a
            href={MONOGOTO_OS_URL}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            Return to Monogoto OS
          </a>
          
          <p className="text-sm text-gray-500 mt-4">
            If you believe this is an error, please contact{' '}
            <a href="mailto:admin@monogoto.io" className="text-blue-600 hover:underline">
              admin@monogoto.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}