import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { api } from '../lib/api.js'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setError('No verification token found.'); return }
    api.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => { setStatus('error'); setError(err.message) })
  }, [token])

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 group">
          <div className="w-9 h-9 bg-[#E53935] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-black text-xl leading-none">v</span>
          </div>
          <span className="text-[#1A1B1E] font-black text-xl tracking-tight">voxa</span>
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E3E5E8] text-center">
          {status === 'loading' && (
            <>
              <Loader2 size={36} className="text-[#E53935] animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-2">Verifying your email…</h1>
              <p className="text-[#96989D] text-sm">Just a moment.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-2">Email verified!</h1>
              <p className="text-[#5C6068] text-sm mb-6">Your email address has been confirmed. You're all set.</p>
              <Link to="/voxa/me" className="block w-full bg-[#E53935] hover:bg-[#C62828] text-white font-bold py-3 rounded-xl transition-all text-sm text-center shadow-sm">
                Go to Voxa
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle size={28} className="text-[#E53935]" />
              </div>
              <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-2">Link expired</h1>
              <p className="text-[#5C6068] text-sm mb-6">{error || 'This verification link is invalid or has expired.'}</p>
              <Link to="/voxa/me" className="block w-full bg-[#E53935] hover:bg-[#C62828] text-white font-bold py-3 rounded-xl transition-all text-sm text-center shadow-sm">
                Go to Voxa
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
