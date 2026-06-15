import { useState, useEffect, useRef } from 'react'
import { X, Search, Users, Compass, Loader2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const CATEGORIES = [
  { id: 'all',       label: 'All',         emoji: '🌐' },
  { id: 'gaming',    label: 'Gaming',      emoji: '🎮' },
  { id: 'music',     label: 'Music',       emoji: '🎵' },
  { id: 'art',       label: 'Art',         emoji: '🎨' },
  { id: 'tech',      label: 'Tech',        emoji: '💻' },
  { id: 'social',    label: 'Social',      emoji: '🤝' },
  { id: 'education', label: 'Education',   emoji: '📚' },
]

const ACCENT = ['#E53935','#6366F1','#10B981','#F59E0B','#3B82F6','#8B5CF6','#EC4899']
const serverColor = (name) => ACCENT[(name?.charCodeAt(0) ?? 0) % ACCENT.length]
const acronym = (name) =>
  name?.split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase() || name?.[0]?.toUpperCase() || '?'

export default function ServerDiscoveryModal({ onClose }) {
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState('all')
  const [servers, setServers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [joining, setJoining]   = useState(null)
  const [joined, setJoined]     = useState({})
  const { refetch }             = useServers()
  const navigate                = useNavigate()
  const inputRef                = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const ctrl  = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.discoverServers(query, category)
        if (!ctrl.signal.aborted) setServers(data)
      } catch (_) {}
      if (!ctrl.signal.aborted) setLoading(false)
    }, query ? 300 : 0)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [query, category])

  const join = async (server) => {
    if (joined[server.id] || joining === server.id) return
    setJoining(server.id)
    try {
      const s = await api.joinPublicServer(server.id)
      setJoined(prev => ({ ...prev, [server.id]: true }))
      await refetch()
      const first = s.categories?.flatMap(c => c.channels).find(c => c.type === 'text')
      onClose()
      navigate(first ? `/voxa/servers/${s.id}/channels/${first.id}` : `/voxa/servers/${s.id}`)
    } catch (err) { alert(err.message) }
    setJoining(null)
  }

  const catMeta = (id) => CATEGORIES.find(c => c.id === id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex flex-col bg-[#313338] rounded-2xl w-full max-w-3xl shadow-2xl border border-white/[0.06] overflow-hidden"
        style={{ maxHeight: 'min(88vh, 720px)' }}>

        {/* ── Header ── */}
        <div className="shrink-0 bg-[#2B2D31] border-b border-white/[0.06] px-5 pt-4 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E53935]/15 flex items-center justify-center shrink-0">
              <Compass size={16} className="text-[#E53935]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-white text-base leading-none">Discover Servers</h2>
              <p className="text-[#6B6E75] text-xs mt-0.5">Find and join public communities</p>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center text-[#6B6E75] hover:text-[#DBDEE1] transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6E75] pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or description…"
              className="w-full bg-[#1E1F22] border border-white/[0.08] text-[#DBDEE1] rounded-xl pl-8.5 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935]/50 placeholder:text-[#6B6E75] transition-all"
            />
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollable-x">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0',
                  category === cat.id
                    ? 'bg-[#E53935] text-white'
                    : 'bg-white/[0.06] text-[#949BA4] hover:bg-white/[0.10] hover:text-[#DBDEE1]'
                )}>
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto scrollable p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={24} className="text-[#6B6E75] animate-spin" />
              <span className="text-[#6B6E75] text-sm">Loading servers…</span>
            </div>
          ) : servers.length === 0 ? (
            <EmptyState query={query} category={category} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {servers.map(server => (
                <ServerCard key={server.id} server={server}
                  joining={joining === server.id} joined={!!joined[server.id]}
                  onJoin={() => join(server)} catMeta={catMeta} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && servers.length > 0 && (
          <div className="shrink-0 px-5 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[#6B6E75] text-xs">
              {servers.length} server{servers.length !== 1 ? 's' : ''} found
            </span>
            <span className="text-[#6B6E75] text-xs">
              Make your server public in <span className="text-[#949BA4]">Server Settings → Overview</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ query, category }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
        <Compass size={22} className="text-[#6B6E75]" />
      </div>
      <p className="text-white font-bold text-sm">
        {query ? 'No servers match your search' : category !== 'all' ? 'No servers in this category yet' : 'No public servers yet'}
      </p>
      <p className="text-[#6B6E75] text-xs max-w-xs leading-relaxed">
        {query
          ? 'Try different keywords or clear the search.'
          : category !== 'all'
          ? 'Try a different category, or clear the filter to see all servers.'
          : 'Server owners can make their server public under Server Settings → Overview.'}
      </p>
    </div>
  )
}

function ServerCard({ server, joining, joined, onJoin, catMeta }) {
  const color = server.iconColor || serverColor(server.name)
  const bannerStyle = server.bannerUrl
    ? {}
    : { background: server.bannerColor ?? server.iconColor ?? color }
  const roles     = (server.roles ?? []).slice(0, 4)
  const extraRoles = Math.max(0, (server.roles ?? []).length - 4)
  const cat       = catMeta(server.category)

  return (
    <div className="bg-[#2B2D31] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all flex flex-col">

      {/* Banner */}
      <div className="h-16 relative shrink-0" style={bannerStyle}>
        {server.bannerUrl && (
          <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        {/* Server icon */}
        <div className="absolute -bottom-5 left-3">
          <div className="w-11 h-11 rounded-xl border-[3px] border-[#2B2D31] flex items-center justify-center text-white font-black text-sm overflow-hidden shadow-lg"
            style={{ background: server.iconUrl ? undefined : color }}>
            {server.iconUrl
              ? <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
              : acronym(server.name)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-7 px-3 pb-3 flex-1 flex flex-col gap-2">

        {/* Name + category */}
        <div>
          <div className="font-bold text-[#DBDEE1] text-sm truncate">{server.name}</div>
          {cat && cat.id !== 'all' && (
            <span className="text-[10px] font-semibold text-[#6B6E75] mt-0.5 block">
              {cat.emoji} {cat.label}
            </span>
          )}
        </div>

        {/* Description */}
        {server.description && (
          <p className="text-[#949BA4] text-xs leading-relaxed line-clamp-2 flex-1">
            {server.description}
          </p>
        )}

        {/* Role badges */}
        {roles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {roles.map((role, i) => (
              <span key={i}
                className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#949BA4]">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-90"
                  style={{ background: role.color ?? '#6B6E75' }} />
                {role.name}
              </span>
            ))}
            {extraRoles > 0 && (
              <span className="text-[10px] text-[#6B6E75]">+{extraRoles}</span>
            )}
          </div>
        )}

        {/* Footer: member count + join */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <div className="flex items-center gap-1 text-[#6B6E75]">
            <Users size={11} />
            <span className="text-xs">
              {server.memberCount.toLocaleString()}
              <span className="hidden sm:inline"> member{server.memberCount !== 1 ? 's' : ''}</span>
            </span>
          </div>
          <button onClick={onJoin} disabled={joining || joined}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
              joined
                ? 'bg-[#23a55a]/15 text-[#23a55a] cursor-default'
                : 'bg-[#E53935] hover:bg-[#C62828] disabled:opacity-60 text-white'
            )}>
            {joined ? '✓ Joined' : joining ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}
