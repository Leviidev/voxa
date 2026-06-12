import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, MessageSquare, LogOut, Settings } from 'lucide-react'
import { useServers } from '../context/ServersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useUnread } from '../context/UnreadContext.jsx'
import CreateServerModal from './CreateServerModal.jsx'
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

function UserAvatar({ user, size = 28 }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName || user.username}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  const color = user?.avatarColor || '#E53935'
  const letter = (user?.displayName || user?.username || '?')[0].toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  )
}

export default function ServerSidebar() {
  const { serverId } = useParams()
  const navigate = useNavigate()
  const { servers } = useServers()
  const { user, logout } = useAuth()
  const { unread } = useUnread()
  const [showCreate, setShowCreate] = useState(false)

  const serverHasUnread = (srv) =>
    srv.categories.flatMap(c => c.channels).some(ch => (unread.channels[ch.id] ?? 0) > 0)

  const goServer = (srv) => {
    const first = srv.categories.flatMap(c => c.channels).find(c => c.type === 'text')
    if (first) navigate(`/voxa/servers/${srv.id}/channels/${first.id}`)
    else navigate(`/voxa/servers/${srv.id}`)
  }

  return (
    <>
      <div className="m-2 w-[210px] bg-[#111214] rounded-2xl shadow-2xl shrink-0 flex flex-col overflow-hidden border border-white/[0.05]">

        {/* Logo / Home */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={() => navigate('/voxa/me')}
            className={clsx(
              'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all group',
              !serverId
                ? 'bg-white/[0.08]'
                : 'hover:bg-white/[0.05]'
            )}
          >
            {!serverId && (
              <div className="w-0.5 h-5 rounded-full bg-[#E53935] absolute -left-0.5" />
            )}
            <div className="w-7 h-7 rounded-lg bg-[#E53935] flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-black text-sm leading-none">v</span>
            </div>
            <span className="font-black text-white text-sm tracking-tight">voxa</span>
            <MessageSquare
              size={13}
              className={clsx(
                'ml-auto transition-colors',
                !serverId ? 'text-white/60' : 'text-white/30 group-hover:text-white/50'
              )}
            />
          </button>
        </div>

        <div className="mx-3 h-px bg-white/[0.06]" />

        {/* Servers list */}
        <div className="flex-1 overflow-y-auto scrollable py-3 px-2">
          {servers.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 px-2.5 pb-2 pt-1">
                Your servers
              </p>
              {servers.map(srv => {
                const isActive = serverId === srv.id
                const hasUnread = serverHasUnread(srv)
                return (
                  <button
                    key={srv.id}
                    onClick={() => goServer(srv)}
                    className={clsx(
                      'relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left mb-0.5',
                      isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#E53935]" />
                    )}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
                      style={{ background: serverColor(srv.name) }}
                    >
                      {acronym(srv.name)}
                    </div>
                    <span className={clsx(
                      'text-sm font-medium truncate flex-1',
                      isActive ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                    )}>
                      {srv.name}
                    </span>
                    {hasUnread && !isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E53935] shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {servers.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-white/30 text-xs leading-relaxed">
                No servers yet.<br />Create one below.
              </p>
            </div>
          )}
        </div>

        {/* Add server button */}
        <div className="mx-3 h-px bg-white/[0.06]" />
        <div className="px-2 py-2">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.05] transition-all group"
          >
            <div className="w-7 h-7 rounded-lg border border-white/[0.12] flex items-center justify-center shrink-0">
              <Plus size={13} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </div>
            <span className="text-sm font-medium text-white/40 group-hover:text-white/70 transition-colors">
              Add a server
            </span>
          </button>
        </div>

        {/* User section */}
        <div className="mx-3 h-px bg-white/[0.06]" />
        <div className="px-2 py-2.5 flex items-center gap-2">
          <UserAvatar user={user} size={28} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white/80 truncate leading-tight">
              {user?.displayName || user?.username || 'you'}
            </div>
            <div className="text-[10px] text-white/30 leading-tight">
              #{user?.discriminator || '0000'}
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center transition-colors group shrink-0"
            title="Sign out"
          >
            <LogOut size={12} className="text-white/30 group-hover:text-white/60 transition-colors" />
          </button>
        </div>

      </div>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
