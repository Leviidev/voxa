import { useParams, useNavigate } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight, Settings, Mic, Headphones, Lock, UserPlus, Bell, Trash2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useServers } from '../context/ServersContext.jsx'
import { MOCK_DMS } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import CreateChannelModal from './CreateChannelModal.jsx'
import clsx from 'clsx'

export default function ChannelSidebar() {
  const { serverId, channelId } = useParams()
  const { servers } = useServers()
  const server = servers.find(s => s.id === serverId)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isMe = !serverId
  const [showCreateChannel, setShowCreateChannel] = useState(false)

  return (
    <>
      <div className="w-60 bg-voxa-sidebar flex flex-col shrink-0">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-black/30 cursor-pointer hover:bg-voxa-hover transition-colors shrink-0">
          {isMe ? (
            <span className="font-bold text-voxa-header text-sm">Direct Messages</span>
          ) : (
            <>
              <span className="font-bold text-voxa-header text-sm truncate">{server?.name ?? 'Unknown Server'}</span>
              <ChevronDown size={16} className="text-voxa-text-muted shrink-0" />
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollable py-2">
          {isMe
            ? <DMList navigate={navigate} />
            : server
              ? <ServerChannels server={server} channelId={channelId} navigate={navigate} serverId={serverId} onAddChannel={() => setShowCreateChannel(true)} />
              : <div className="px-4 py-3 text-voxa-text-dim text-xs">Server not found</div>
          }
        </div>

        <UserPanel user={user} logout={logout} navigate={navigate} />
      </div>

      {showCreateChannel && serverId && (
        <CreateChannelModal serverId={serverId} onClose={() => setShowCreateChannel(false)} />
      )}
    </>
  )
}

function DMList({ navigate }) {
  return (
    <div>
      <div className="px-4 mb-2">
        <button className="w-full bg-voxa-input hover:bg-voxa-hover text-voxa-text-muted text-xs px-3 py-1.5 rounded text-left transition-colors">
          Find or start a conversation
        </button>
      </div>
      <SectionLabel label="Direct Messages" action={<UserPlus size={14} />} />
      {MOCK_DMS.map(dm => (
        <div key={dm.id}
          className="flex items-center gap-3 px-2 mx-2 py-1.5 rounded-md hover:bg-voxa-hover cursor-pointer group transition-colors">
          <div className="relative">
            <Avatar username={dm.username} size="sm" />
            <StatusDot status={dm.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-voxa-text-muted group-hover:text-voxa-header truncate transition-colors">{dm.username}</div>
            <div className="text-xs text-voxa-text-dim truncate">{dm.lastMessage}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ServerChannels({ server, channelId, navigate, serverId, onAddChannel }) {
  return (
    <div>
      {server.categories.map(cat => (
        <Category key={cat.id} cat={cat} channelId={channelId} navigate={navigate} serverId={serverId} onAddChannel={onAddChannel} />
      ))}
    </div>
  )
}

function Category({ cat, channelId, navigate, serverId, onAddChannel }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="mb-1">
      <div className="flex items-center w-full px-4 py-1 group">
        <button onClick={() => setCollapsed(v => !v)} className="flex items-center gap-1 flex-1 text-voxa-text-dim hover:text-voxa-text-muted transition-colors">
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          <span className="text-xs font-semibold uppercase tracking-wider">{cat.name}</span>
        </button>
        <button onClick={onAddChannel}
          className="opacity-0 group-hover:opacity-100 text-voxa-text-dim hover:text-voxa-header transition-all">
          <Plus size={14} />
        </button>
      </div>
      {!collapsed && cat.channels.map(ch => (
        <Channel key={ch.id} ch={ch} active={ch.id === channelId} navigate={navigate} serverId={serverId} />
      ))}
    </div>
  )
}

function Channel({ ch, active, navigate, serverId }) {
  const isVoice = ch.type === 'voice'
  const Icon = isVoice ? Volume2 : Hash
  return (
    <div>
      <div
        onClick={() => !isVoice && navigate(`/voxa/servers/${serverId}/channels/${ch.id}`)}
        className={clsx(
          'flex items-center gap-1.5 px-4 py-1.5 mx-2 rounded group cursor-pointer transition-colors',
          active ? 'bg-voxa-selected text-voxa-header' : 'text-voxa-text-dim hover:bg-voxa-hover hover:text-voxa-text-muted',
          isVoice ? '!cursor-default' : ''
        )}
      >
        <Icon size={16} className="shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">{ch.name}</span>
        {ch.unread && !active && <div className="w-2 h-2 bg-voxa-header rounded-full shrink-0" />}
        {ch.locked && <Lock size={12} className="shrink-0 opacity-60" />}
      </div>
      {isVoice && ch.members?.length > 0 && (
        <div className="pl-10 pb-1">
          {ch.members.map(m => (
            <div key={m} className="flex items-center gap-2 py-0.5 text-voxa-text-dim text-xs">
              <div className="w-5 h-5 rounded-full bg-voxa-input flex items-center justify-center text-[9px] font-bold text-voxa-text-muted">
                {m[0]}
              </div>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ label, action }) {
  return (
    <div className="flex items-center justify-between px-4 mb-1">
      <span className="text-voxa-text-dim text-xs font-semibold uppercase tracking-wider">{label}</span>
      {action && <button className="text-voxa-text-dim hover:text-voxa-header transition-colors">{action}</button>}
    </div>
  )
}

function UserPanel({ user, logout, navigate }) {
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  if (!user) return null
  return (
    <div className="h-14 bg-voxa-sidebar-dark px-2 flex items-center gap-2 shrink-0 border-t border-black/20">
      <div className="relative cursor-pointer" onClick={() => navigate('/voxa/me')}>
        <Avatar username={user.username} size="sm" />
        <StatusDot status="online" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/voxa/me')}>
        <div className="text-sm font-semibold text-voxa-header truncate leading-tight">{user.username}</div>
        <div className="text-xs text-voxa-text-dim truncate">#{user.discriminator}</div>
      </div>
      <div className="flex items-center gap-0.5">
        <PanelBtn label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(v => !v)} active={muted}>
          <Mic size={16} />
        </PanelBtn>
        <PanelBtn label={deafened ? 'Undeafen' : 'Deafen'} onClick={() => setDeafened(v => !v)} active={deafened}>
          <Headphones size={16} />
        </PanelBtn>
        <PanelBtn label="User Settings" onClick={() => navigate('/voxa/me')}>
          <Settings size={16} />
        </PanelBtn>
      </div>
    </div>
  )
}

function PanelBtn({ children, label, onClick, active }) {
  return (
    <button title={label} onClick={onClick}
      className={clsx(
        'w-8 h-8 rounded flex items-center justify-center transition-colors',
        active ? 'bg-voxa-red/20 text-voxa-red' : 'text-voxa-text-muted hover:bg-voxa-hover hover:text-voxa-header'
      )}>
      {children}
    </button>
  )
}

const AVATAR_COLORS = ['#E53935', '#8E24AA', '#1565C0', '#2E7D32', '#E65100', '#00838F']

function Avatar({ username, size = 'md' }) {
  const color = AVATAR_COLORS[username?.charCodeAt(0) % AVATAR_COLORS.length] ?? '#E53935'
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold text-white', sz)}
      style={{ background: color }}>
      {username?.[0]?.toUpperCase()}
    </div>
  )
}

function StatusDot({ status }) {
  const color = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#80848e' }[status] ?? '#80848e'
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-voxa-sidebar"
      style={{ background: color }} />
  )
}
