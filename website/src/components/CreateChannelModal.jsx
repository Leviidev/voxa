import { useState } from 'react'
import { X, Hash, Volume2 } from 'lucide-react'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

export default function CreateChannelModal({ serverId, onClose }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const { createChannel } = useServers()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const channelId = createChannel(serverId, name, type)
    onClose()
    if (type === 'text') navigate(`/voxa/servers/${serverId}/channels/${channelId}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#313338] rounded-2xl w-full max-w-md shadow-2xl p-8">
        <button onClick={onClose}
          className="absolute right-4 top-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-voxa-text-muted hover:text-white transition-colors">
          <X size={14} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Create Channel</h2>
        <p className="text-voxa-text-muted text-sm mb-6">in <span className="text-white font-medium">your server</span></p>

        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-voxa-header mb-2">Channel Type</label>
          <div className="space-y-2">
            {[
              { t: 'text', label: 'Text', desc: 'Send messages, images, and files', icon: Hash },
              { t: 'voice', label: 'Voice', desc: 'Hang out with voice, video, and screen share', icon: Volume2 },
            ].map(opt => (
              <label key={opt.t}
                className={clsx('flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors',
                  type === opt.t ? 'bg-voxa-selected' : 'bg-voxa-hover hover:bg-voxa-selected')}>
                <input type="radio" name="type" value={opt.t} checked={type === opt.t}
                  onChange={() => setType(opt.t)} className="sr-only" />
                <opt.icon size={20} className="text-voxa-text-muted shrink-0" />
                <div>
                  <div className="text-white font-medium text-sm">{opt.label}</div>
                  <div className="text-voxa-text-dim text-xs">{opt.desc}</div>
                </div>
                <div className={clsx('ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  type === opt.t ? 'border-voxa-red' : 'border-voxa-text-dim')}>
                  {type === opt.t && <div className="w-2 h-2 rounded-full bg-voxa-red" />}
                </div>
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-bold uppercase tracking-wider text-voxa-header mb-2">Channel Name</label>
          <div className="relative mb-6">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-voxa-text-dim">
              {type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
            </div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="new-channel"
              className="w-full bg-voxa-input text-white rounded-lg pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-voxa-red/50 placeholder:text-voxa-text-dim"
              maxLength={100}
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={onClose} className="text-voxa-text-muted hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={!name.trim()}
              className="bg-voxa-red hover:bg-voxa-red-light disabled:opacity-40 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
