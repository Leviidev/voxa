import { useState } from 'react'
import { X, Hash, Volume2 } from 'lucide-react'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

export default function CreateChannelModal({ serverId, onClose }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [loading, setLoading] = useState(false)
  const { createChannel } = useServers()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const channelId = await createChannel(serverId, name, type)
      onClose()
      if (type === 'text') navigate(`/voxa/servers/${serverId}/channels/${channelId}`)
    } finally {
      setLoading(false)
    }
  }

  const channelTypes = [
    { t: 'text', label: 'Text channel', desc: 'Send messages, images, and files', icon: Hash },
    { t: 'voice', label: 'Voice channel', desc: 'Hang out with voice and video', icon: Volume2 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#E3E5E8] p-8">
        <button onClick={onClose}
          className="absolute right-4 top-4 w-7 h-7 rounded-full bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors">
          <X size={14} />
        </button>

        <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Create a channel</h2>
        <p className="text-[#5C6068] text-sm mb-5">Choose a type and give it a name.</p>

        <div className="mb-5">
          <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-2">Channel type</label>
          <div className="space-y-2">
            {channelTypes.map(opt => (
              <label key={opt.t}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors',
                  type === opt.t
                    ? 'bg-[#FFF5F5] border-[#E53935]/30'
                    : 'bg-[#F7F8FA] border-[#E3E5E8] hover:bg-[#F2F3F5]'
                )}>
                <input type="radio" name="type" value={opt.t} checked={type === opt.t}
                  onChange={() => setType(opt.t)} className="sr-only" />
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  type === opt.t ? 'bg-[#E53935]/10' : 'bg-[#E3E5E8]'
                )}>
                  <opt.icon size={16} className={type === opt.t ? 'text-[#E53935]' : 'text-[#96989D]'} />
                </div>
                <div className="flex-1">
                  <div className="text-[#1A1B1E] font-medium text-sm">{opt.label}</div>
                  <div className="text-[#96989D] text-xs">{opt.desc}</div>
                </div>
                <div className={clsx(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  type === opt.t ? 'border-[#E53935]' : 'border-[#D5D7DC]'
                )}>
                  {type === opt.t && <div className="w-2 h-2 rounded-full bg-[#E53935]" />}
                </div>
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Channel name</label>
          <div className="relative mb-6">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96989D]">
              {type === 'text' ? <Hash size={15} /> : <Volume2 size={15} />}
            </div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="new-channel"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] transition-all"
              maxLength={100}
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={onClose} className="text-[#5C6068] hover:text-[#1A1B1E] text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={!name.trim() || loading}
              className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
              {loading ? 'Creating…' : 'Create channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
