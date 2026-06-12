import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useServers } from '../context/ServersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function InviteJoin() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refetch } = useServers()
  const [status, setStatus] = useState('joining') // joining | success | error
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) { navigate(`/login?redirect=/invite/${code}`); return }
    api.joinByInvite(code)
      .then(async (server) => {
        await refetch()
        setStatus('success')
        const firstText = server?.categories?.flatMap(c => c.channels)?.find(c => c.type === 'text')
        setTimeout(() => {
          if (firstText) navigate(`/voxa/servers/${server.id}/channels/${firstText.id}`)
          else navigate(`/voxa/servers/${server.id}`)
        }, 1200)
      })
      .catch(err => { setError(err.message); setStatus('error') })
  }, [code])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E53935] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white font-black text-2xl">V</span>
        </div>

        {status === 'joining' && (
          <>
            <div className="w-8 h-8 border-3 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Joining server…</h2>
            <p className="text-[#96989D] text-sm">Hang on a sec</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-black text-[#1A1B1E] mb-1">You're in!</h2>
            <p className="text-[#96989D] text-sm">Redirecting you to the server…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Invite invalid</h2>
            <p className="text-[#96989D] text-sm mb-5">{error || 'This invite link is expired or invalid.'}</p>
            <button onClick={() => navigate('/voxa/me')}
              className="bg-[#E53935] hover:bg-[#C62828] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              Go to Voxa
            </button>
          </>
        )}
      </div>
    </div>
  )
}
