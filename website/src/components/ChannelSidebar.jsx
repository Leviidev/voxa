import { useParams, useNavigate } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight, Mic, Headphones, Settings, Plus, Lock } from 'lucide-react'
import { useState } from 'react'
import { useServers } from '../context/ServersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import CreateChannelModal from './CreateChannelModal.jsx'
import ServerSettingsModal from './ServerSettingsModal.jsx'
import clsx from 'clsx'

export default function ChannelSidebar() {
  const { serverId, channelId } = useParams()
  const { servers } = useServers()
  const server = servers.find(s => s.id === serverId)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)

  const isMe = !serverId

  return (
    <>
      <div className="w-[220px] bg-[#F7F8FA] border-r border-[#E3E5E8] flex flex-col shrink-0">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#E3E5E8] shrink-0 group">
          {isMe ? (
            <span className="font-bold text-[#1A1B1E] text-sm">Direct Messages</span>
          ) : (
            <>
              <span className="font-bold text-[#1A1B1E] text-sm truncate flex-1">{server?.name ?? '…'}</span>
              <button
                onClick={() => setShowServerSettings(true)}
                title="Server Settings"
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-all shrink-0 ml-1"
              >
                <Settings size={13} />
              </button>
            </>
          )}
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto scrollable py-2">
          {isMe ? (
            <DMList navigate={navigate} user={user} />
          ) : server ? (
            <ServerChannels
              server={server}
              channelId={channelId}
              navigate={navigate}
              serverId={serverId}
              onAddChannel={() => setShowCreateChannel(true)}
            />
          ) : (
            <div className="px-4 py-4 text-[#96989D] text-xs">Server not found</div>
          )}
        </div>

        {/* User panel */}
        <UserPanel user={user} logout={logout} navigate={navigate} />
      </div>

      {showCreateChannel && serverId && (
        <CreateChannelModal serverId={serverId} onClose={() => setShowCreateChannel(false)} />
      )}

      {showServerSettings && server && (
        <ServerSettingsModal server={server} onClose={() => setShowServerSettings(false)} />
      )}
    </>
  )
}

function DMList({ navigate, user }) {
  return (
    <div className="px-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] px-2 pt-2 pb-1">Direct Messages</p>
      <div className="py-6 text-center">
        <p className="text-[#96989D] text-xs leading-relaxed">No messages yet.<br />Find friends to chat with.</p>
      </div>
    </div>
  )
}

function ServerChannels({ server, channelId, navigate, serverId, onAddChannel }) {
  return (
    <div>
      {server.categories.map(cat => (
        <Category
          key={cat.id}
          cat={cat}
          channelId={channelId}
          navigate={navigate}
          serverId={serverId}
          onAddChannel={onAddChannel}
        />
      ))}
    </div>
  )
}

function Category({ cat, channelId, navigate, serverId, onAddChannel }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="mb-1">
      <div className="flex items-center px-3 py-1 group">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-1 flex-1 text-[#96989D] hover:text-[#5C6068] transition-colors"
        >
          {collapsed
            ? <ChevronRight size={10} className="shrink-0" />
            : <ChevronDown size={10} className="shrink-0" />}
          <span className="text-[10px] font-bold uppercase tracking-wider ml-0.5">{cat.name}</span>
        </button>
        <button
          onClick={onAddChannel}
          className="opacity-0 group-hover:opacity-100 text-[#96989D] hover:text-[#5C6068] transition-all"
        >
          <Plus size={13} />
        </button>
      </div>
      {!collapsed && cat.channels.map(ch => (
        <ChannelRow
          key={ch.id}
          ch={ch}
          active={ch.id === channelId}
          navigate={navigate}
          serverId={serverId}
        />
      ))}
    </div>
  )
}

function ChannelRow({ ch, active, navigate, serverId }) {
  const isVoice = ch.type === 'voice'
  const Icon = isVoice ? Volume2 : Hash
  return (
    <div
      onClick={() => !isVoice && navigate(`/voxa/servers/${serverId}/channels/${ch.id}`)}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 mx-2 rounded-lg cursor-pointer transition-colors',
        active
          ? 'bg-[#E0E2E6] text-[#1A1B1E]'
          : 'text-[#96989D] hover:bg-[#EAEBEE] hover:text-[#5C6068]',
        isVoice && 'cursor-default'
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className="text-sm font-medium flex-1 truncate">{ch.name}</span>
      {ch.locked && <Lock size={11} className="shrink-0 opacity-60" />}
    </div>
  )
}

function UserPanel({ user, logout, navigate }) {
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)

  const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
  const color = user?.avatarColor ?? (user ? COLORS[user.username?.charCodeAt(0) % COLORS.length] : '#E53935')

  if (!user) return null
  return (
    <div className="h-14 bg-[#E3E5E8] px-3 flex items-center gap-2 shrink-0 border-t border-[#D5D7DC]">
      <div className="relative cursor-pointer shrink-0" onClick={() => navigate('/voxa/me')}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs overflow-hidden"
          style={{ background: user.avatarUrl ? undefined : color }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : (user.displayName ?? user.username)?.[0]?.toUpperCase()}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#E3E5E8]" />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/voxa/me')}>
        <div className="text-xs font-semibold text-[#1A1B1E] truncate leading-tight">
          {user.displayName ?? user.username}
        </div>
        <div className="text-[10px] text-[#96989D] truncate">
          {user.customStatus || `#${user.discriminator}`}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <PanelBtn label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(v => !v)} active={muted}>
          <Mic size={14} />
        </PanelBtn>
        <PanelBtn label={deafened ? 'Undeafen' : 'Deafen'} onClick={() => setDeafened(v => !v)} active={deafened}>
          <Headphones size={14} />
        </PanelBtn>
        <PanelBtn label="User Settings" onClick={() => navigate('/voxa/me')}>
          <Settings size={14} />
        </PanelBtn>
      </div>
    </div>
  )
}

function PanelBtn({ children, label, onClick, active }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={clsx(
        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
        active
          ? 'bg-[#E53935]/10 text-[#E53935]'
          : 'text-[#96989D] hover:bg-[#D5D7DC] hover:text-[#5C6068]'
      )}
    >
      {children}
    </button>
  )
}
