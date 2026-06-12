import { useState, useEffect, useRef } from 'react'
import { X, Search, Users, Compass, Loader2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const ACCENT_COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
function serverColor(name) {
  if (!name) return ACCENT_COLORS[0]
  return ACCENT_COLORS[name.charCodeAt(0) % ACCENT_COLORS.length]
}
function acronym(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || name[0].toUpperCase()
}

export default function ServerDiscoveryModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(null)
  const [joined, setJoined] = useState({})
  const { refetch } = useServers()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.discoverServers(query)
        if (!controller.signal.aborted) setServers(data)
      } catch (_) {}
      if (!controller.signal.aborted) setLoading(false)
    }, query ? 300 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  const join = async (server) => {
    if (joined[server.id] || joining === server.id) return
    setJoining(server.id)
    try {
      const s = await api.joinPublicServer(server.id)
      setJoined(prev => ({ ...prev, [server.id]: true }))
      await refetch()
      const first = s.categories?.flatMap(c => c.channels).find(c => c.type === 'text')
      onClose()
      if (first) navigate(`/voxa/servers/${s.id}/channels/${first.id}`)
      else navigate(`/voxa/servers/${s.id}`)
    } catch (err) {
      alert(err.message)
    }
    setJoining(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-[#E3E5E8] overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E3E5E8] shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
            <Compass size={16} className="text-[#6366F1]" />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-[#1A1B1E] text-base leading-none">Discover servers</h2>
            <p className="text-[#96989D] text-xs mt-0.5">Find public communities to join</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[#E3E5E8] shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96989D]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search servers…"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] placeholder:text-[#96989D] transition-all"
            />
          </div>
        </div>

        {/* Server list */}
        <div className="flex-1 overflow-y-auto scrollable">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="text-[#96989D] animate-spin" />
            </div>
          ) : servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F3F5] flex items-center justify-center border border-[#E3E5E8]">
                <Compass size={22} className="text-[#96989D]" />
              </div>
              <p className="text-[#1A1B1E] font-bold text-sm">
                {query ? 'No servers found' : 'No public servers yet'}
              </p>
              <p className="text-[#96989D] text-xs max-w-xs leading-relaxed">
                {query
                  ? 'Try a different search term.'
                  : 'Server owners can make their server public in Server Settings → Overview.'}
              </p>
            </div>
          ) : (
            <div className="p-3 grid gap-2">
              {servers.map(server => (
                <ServerCard
                  key={server.id}
                  server={server}
                  joining={joining === server.id}
                  joined={!!joined[server.id]}
                  onJoin={() => join(server)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ServerCard({ server, joining, joined, onJoin }) {
  const color = server.iconColor || serverColor(server.name)
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E3E5E8] hover:bg-[#F7F8FA] transition-colors">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 overflow-hidden"
        style={{ background: server.iconUrl ? undefined : color }}>
        {server.iconUrl
          ? <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
          : acronym(server.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#1A1B1E] text-sm truncate">{server.name}</div>
        {server.description && (
          <div className="text-[#5C6068] text-xs truncate mt-0.5">{server.description}</div>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Users size={11} className="text-[#96989D]" />
          <span className="text-[#96989D] text-xs">{server.memberCount.toLocaleString()} member{server.memberCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <button
        onClick={onJoin}
        disabled={joining || joined}
        className={clsx(
          'shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all',
          joined
            ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
            : 'bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-60 text-white'
        )}>
        {joined ? 'Joined ✓' : joining ? 'Joining…' : 'Join'}
      </button>
    </div>
  )
}
