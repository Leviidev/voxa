import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, MessageSquare } from 'lucide-react'
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

export default function ServerSidebar() {
  const { serverId } = useParams()
  const navigate = useNavigate()
  const { servers } = useServers()
  const { user } = useAuth()
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
      <div className="w-[220px] bg-[#F2F3F5] border-r border-[#E3E5E8] flex flex-col shrink-0 overflow-hidden">
        {/* Logo / Home */}
        <div className="px-3 py-3 border-b border-[#E3E5E8]">
          <button
            onClick={() => navigate('/voxa/me')}
            className={clsx(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors',
              !serverId ? 'bg-[#E0E2E6]' : 'hover:bg-[#EAEBEE]'
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-[#E53935] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm leading-none">v</span>
            </div>
            <span className="font-black text-[#1A1B1E] text-sm tracking-tight">voxa</span>
            <MessageSquare size={14} className="ml-auto text-[#96989D]" />
          </button>
        </div>

        {/* Servers list */}
        <div className="flex-1 overflow-y-auto scrollable py-2 px-2">
          {servers.length > 0 && (
            <div className="mb-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] px-2 pb-1 pt-1">Your servers</p>
              {servers.map(srv => (
                <button
                  key={srv.id}
                  onClick={() => goServer(srv)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors text-left',
                    serverId === srv.id ? 'bg-[#E0E2E6]' : 'hover:bg-[#EAEBEE]'
                  )}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ background: serverColor(srv.name) }}
                  >
                    {acronym(srv.name)}
                  </div>
                  <span className={clsx(
                    'text-sm font-medium truncate',
                    serverId === srv.id ? 'text-[#1A1B1E]' : 'text-[#5C6068]'
                  )}>
                    {srv.name}
                  </span>
                  {serverHasUnread(srv) && (
                    <div className="w-2 h-2 rounded-full bg-[#E53935] shrink-0 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {servers.length === 0 && (
            <div className="px-2 py-6 text-center">
              <p className="text-[#96989D] text-xs leading-relaxed">No servers yet.<br />Create one below.</p>
            </div>
          )}
        </div>

        {/* Add server button */}
        <div className="px-2 pb-2 border-t border-[#E3E5E8] pt-2">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#EAEBEE] transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-white border border-[#E3E5E8] flex items-center justify-center shrink-0">
              <Plus size={14} className="text-[#5C6068]" />
            </div>
            <span className="text-sm font-medium text-[#5C6068]">Add a server</span>
          </button>
        </div>

      </div>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
