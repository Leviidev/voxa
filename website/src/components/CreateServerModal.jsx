import { useState } from 'react'
import { X, Hash, Users, ArrowRight } from 'lucide-react'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function CreateServerModal({ onClose }) {
  const [step, setStep] = useState('choose')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { createServer } = useServers()
  const navigate = useNavigate()

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const { server, channelId } = await createServer(name)
      onClose()
      if (channelId) navigate(`/voxa/servers/${server.id}/channels/${channelId}`)
      else navigate(`/voxa/servers/${server.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#E3E5E8] overflow-hidden">
        <button onClick={onClose}
          className="absolute right-4 top-4 w-7 h-7 rounded-full bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors">
          <X size={14} />
        </button>

        {step === 'choose' && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Create a server</h2>
              <p className="text-[#5C6068] text-sm">Your server is where your group hangs out.</p>
            </div>
            <div className="space-y-2.5">
              <button onClick={() => setStep('create')}
                className="w-full flex items-center justify-between bg-[#F7F8FA] hover:bg-[#F2F3F5] border border-[#E3E5E8] px-4 py-4 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                    <Hash size={18} className="text-[#E53935]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#1A1B1E] text-sm">Create my own</div>
                    <div className="text-[#96989D] text-xs">Start fresh with a new server</div>
                  </div>
                </div>
                <ArrowRight size={15} className="text-[#96989D] group-hover:text-[#5C6068] transition-colors" />
              </button>
              <button onClick={() => setStep('join')}
                className="w-full flex items-center justify-between bg-[#F7F8FA] hover:bg-[#F2F3F5] border border-[#E3E5E8] px-4 py-4 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                    <Users size={18} className="text-[#6366F1]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#1A1B1E] text-sm">Join a server</div>
                    <div className="text-[#96989D] text-xs">Enter an invite link</div>
                  </div>
                </div>
                <ArrowRight size={15} className="text-[#96989D] group-hover:text-[#5C6068] transition-colors" />
              </button>
            </div>
          </div>
        )}

        {step === 'create' && (
          <form onSubmit={handleCreate} className="p-8">
            <button type="button" onClick={() => setStep('choose')}
              className="text-[#96989D] hover:text-[#5C6068] text-xs font-medium mb-5 flex items-center gap-1 transition-colors">
              ← Back
            </button>
            <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Name your server</h2>
            <p className="text-[#5C6068] text-sm mb-6">You can rename it anytime.</p>
            <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Server name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Awesome Server"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] mb-6 transition-all"
              maxLength={100}
            />
            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} className="text-[#5C6068] hover:text-[#1A1B1E] text-sm font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={!name.trim() || loading}
                className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                {loading ? 'Creating…' : 'Create server'}
              </button>
            </div>
          </form>
        )}

        {step === 'join' && (
          <form onSubmit={e => { e.preventDefault(); onClose() }} className="p-8">
            <button type="button" onClick={() => setStep('choose')}
              className="text-[#96989D] hover:text-[#5C6068] text-xs font-medium mb-5 flex items-center gap-1 transition-colors">
              ← Back
            </button>
            <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Join a server</h2>
            <p className="text-[#5C6068] text-sm mb-6">Paste an invite link below.</p>
            <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Invite link</label>
            <input autoFocus placeholder="https://voxa.lol/invite/abc123"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] mb-6 transition-all"
            />
            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} className="text-[#5C6068] hover:text-[#1A1B1E] text-sm font-medium transition-colors">Cancel</button>
              <button type="submit" className="bg-[#E53935] hover:bg-[#C62828] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">Join server</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
