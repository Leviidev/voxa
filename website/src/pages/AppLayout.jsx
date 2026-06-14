import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { UnreadProvider } from '../context/UnreadContext.jsx'
import ServerSidebar from '../components/ServerSidebar.jsx'
import ChannelSidebar from '../components/ChannelSidebar.jsx'
import { Mail, CheckCircle2, LogOut } from 'lucide-react'
import { api } from '../lib/api.js'

function EmailVerificationWall({ user, onLogout }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const resend = async () => {
    setLoading(true)
    try {
      await api.resendVerification()
      setSent(true)
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1E1F22]">
      <div className="w-full max-w-[400px] mx-4">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-[#E53935] rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xl leading-none">v</span>
          </div>
          <span className="text-white font-black text-xl tracking-tight">voxa</span>
        </div>
        <div className="bg-[#2B2D31] rounded-2xl p-8 shadow-2xl border border-white/[0.06] text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight mb-2">Verify your email</h1>
          <p className="text-[#949BA4] text-sm mb-1">We sent a verification link to</p>
          <p className="text-[#DBDEE1] font-semibold text-sm mb-6">{user?.email ?? 'your email address'}</p>
          {sent ? (
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium mb-6">
              <CheckCircle2 size={16} />
              Email sent — check your inbox.
            </div>
          ) : (
            <button onClick={resend} disabled={loading}
              className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm mb-3">
              {loading ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <button onClick={onLogout}
            className="flex items-center justify-center gap-1.5 w-full text-[#6B6E75] hover:text-[#949BA4] text-xs font-medium transition-colors py-2">
            <LogOut size={13} /> Log out
          </button>
        </div>
        <p className="text-center text-[#4E5058] text-xs mt-5">
          Already verified?{' '}
          <button onClick={() => window.location.reload()} className="text-[#6B6E75] hover:text-[#949BA4] transition-colors underline underline-offset-2">
            Refresh the page
          </button>
        </p>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  if (loading || !user) return (
    <div className="flex h-screen items-center justify-center bg-[#1E1F22]">
      <div className="w-8 h-8 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user.emailVerified) return (
    <EmailVerificationWall user={user} onLogout={() => { logout(); navigate('/') }} />
  )

  return (
    <UnreadProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#1E1F22]">
        <ServerSidebar />
        <ChannelSidebar />
        <div className="flex flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </UnreadProvider>
  )
}
