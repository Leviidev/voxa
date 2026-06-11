import { useState } from 'react'
import { X, Hash, Volume2, ArrowRight } from 'lucide-react'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function CreateServerModal({ onClose }) {
  const [step, setStep] = useState('choose') // choose | create | join
  const [name, setName] = useState('')
  const [invite, setInvite] = useState('')
  const { createServer } = useServers()
  const navigate = useNavigate()

  const handleCreate = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const { server, channelId } = createServer(name)
    onClose()
    navigate(`/voxa/servers/${server.id}/channels/${channelId}`)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#313338] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <button onClick={onClose}
          className="absolute right-4 top-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-voxa-text-muted hover:text-white transition-colors">
          <X size={14} />
        </button>

        {step === 'choose' && (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Create your server</h2>
            <p className="text-voxa-text-muted text-sm mb-8 leading-relaxed">
              Your server is where you and your friends hang out. Make yours and start talking.
            </p>
            <div className="space-y-3">
              <button onClick={() => setStep('create')}
                className="w-full flex items-center justify-between bg-voxa-hover hover:bg-voxa-selected px-4 py-4 rounded-xl transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-voxa-red/20 flex items-center justify-center">
                    <Hash size={18} className="text-voxa-red" />
                  </div>
                  <span className="font-semibold text-white text-sm">Create My Own</span>
                </div>
                <ArrowRight size={16} className="text-voxa-text-muted group-hover:text-white transition-colors" />
              </button>
              <button onClick={() => setStep('join')}
                className="w-full flex items-center justify-between bg-voxa-hover hover:bg-voxa-selected px-4 py-4 rounded-xl transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Volume2 size={18} className="text-blue-400" />
                  </div>
                  <span className="font-semibold text-white text-sm">Join a Server</span>
                </div>
                <ArrowRight size={16} className="text-voxa-text-muted group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        )}

        {step === 'create' && (
          <form onSubmit={handleCreate} className="p-8">
            <button type="button" onClick={() => setStep('choose')}
              className="text-voxa-text-muted hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Customize your server</h2>
            <p className="text-voxa-text-muted text-sm mb-6">Give it a name. You can change this later.</p>

            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-voxa-sidebar border-2 border-dashed border-voxa-text-dim flex flex-col items-center justify-center cursor-pointer hover:border-voxa-text-muted transition-colors gap-1">
                <span className="text-voxa-text-muted text-xs font-semibold">UPLOAD</span>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-voxa-header mb-2">
              Server Name <span className="text-voxa-red">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Awesome Server"
              className="w-full bg-voxa-input text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-voxa-red/50 placeholder:text-voxa-text-dim mb-6"
              maxLength={100}
            />

            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} className="text-voxa-text-muted hover:text-white text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={!name.trim()}
                className="bg-voxa-red hover:bg-voxa-red-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
                Create Server
              </button>
            </div>
          </form>
        )}

        {step === 'join' && (
          <form onSubmit={handleJoin} className="p-8">
            <button type="button" onClick={() => setStep('choose')}
              className="text-voxa-text-muted hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Join a Server</h2>
            <p className="text-voxa-text-muted text-sm mb-6">Enter an invite link to join an existing server.</p>

            <label className="block text-xs font-bold uppercase tracking-wider text-voxa-header mb-2">Invite Link</label>
            <input
              autoFocus
              value={invite}
              onChange={e => setInvite(e.target.value)}
              placeholder="https://voxa.lol/invite/abc123"
              className="w-full bg-voxa-input text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-voxa-red/50 placeholder:text-voxa-text-dim mb-6"
            />

            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} className="text-voxa-text-muted hover:text-white text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={!invite.trim()}
                className="bg-voxa-red hover:bg-voxa-red-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
                Join Server
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
