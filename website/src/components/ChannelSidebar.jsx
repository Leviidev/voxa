import { useParams, useNavigate } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight, Mic, Headphones, Settings, Plus, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useServers } from '../context/ServersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useUnread } from '../context/UnreadContext.jsx'
import CreateChannelModal from './CreateChannelModal.jsx'
import ServerSettingsModal from './ServerSettingsModal.jsx'
import clsx from 'clsx'
import { api } from '../lib/api.js'

export default function ChannelSidebar() {
  const { serverId, channelId } = useParams()
  const { servers } = useServers()
  const server = servers.find(s => s.id === serverId)
  const { user, logout } = useAuth()
  const { unread } = useUnread()
  const navigate = useNavigate()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)

  const isMe = !serverId

  return (
    <>
      <div className="w-[220px] bg-[#2B2D31] flex flex-col shrink-0">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.06] shrink-0 shadow-sm">
          {isMe ? (
            <span className="font-bold text-white text-sm">Direct Messages</span>
          ) : (
            <>
              <span className="font-bold text-white text-sm truncate flex-1">{server?.name ?? '…'}</span>
              <button
                onClick={() => setShowServerSettings(true)}
                title="Server Settings"
                className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-[#949BA4] hover:text-[#DBDEE1] transition-colors shrink-0 ml-1"
              >
                <Settings size={13} />
              </button>
            </>
          )}
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto scrollable py-2">
          {isMe ? (
            <DMList navigate={navigate} user={user} unread={unread} />
          ) : server ? (
            <ServerChannels
              server={server}
              channelId={channelId}
              navigate={navigate}
              serverId={serverId}
              onAddChannel={() => setShowCreateChannel(true)}
              unread={unread}
            />
          ) : (
            <div className="px-4 py-4 text-[#6B6E75] text-xs">Server not found</div>
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

function DMList({ navigate, user, unread }) {
  const { dmId } = useParams()
  const [dms, setDms] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newError, setNewError] = useState('')
  const [newLoading, setNewLoading] = useState(false)

  useEffect(() => {
    api.getDms().then(setDms).catch(() => {})
  }, [])

  const openNewDm = async (e) => {
    e.preventDefault()
    const name = newUsername.trim()
    if (!name) return
    setNewLoading(true)
    setNewError('')
    try {
      const dm = await api.openDm(undefined, name)
      setDms(prev => prev.find(d => d.id === dm.id) ? prev : [dm, ...prev])
      setShowNew(false)
      setNewUsername('')
      navigate(`/voxa/me/dms/${dm.id}`)
    } catch (err) {
      setNewError(err.message)
    } finally {
      setNewLoading(false)
    }
  }

  const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
  const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

  return (
    <div className="px-2">
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6E75]">Direct Messages</p>
        <button onClick={() => setShowNew(v => !v)}
          className="text-[#6B6E75] hover:text-[#DBDEE1] transition-colors" title="New DM">
          <Plus size={13} />
        </button>
      </div>

      {showNew && (
        <form onSubmit={openNewDm} className="mx-1 mb-2">
          <input
            autoFocus
            value={newUsername}
            onChange={e => { setNewUsername(e.target.value); setNewError('') }}
            placeholder="username or username#1234"
            className="w-full bg-[#1E1F22] border border-white/[0.08] focus:border-[#E53935]/50 rounded-lg px-3 py-1.5 text-xs text-[#DBDEE1] outline-none placeholder:text-[#6B6E75] transition-colors"
          />
          {newError && <p className="text-[10px] text-[#E53935] mt-1 px-1">{newError}</p>}
          <div className="flex gap-1 mt-1">
            <button type="submit" disabled={newLoading || !newUsername.trim()}
              className="flex-1 bg-[#E53935] disabled:opacity-40 text-white rounded-lg py-1 text-[11px] font-semibold transition-colors hover:bg-[#C62828]">
              {newLoading ? '…' : 'Open DM'}
            </button>
            <button type="button" onClick={() => { setShowNew(false); setNewUsername(''); setNewError('') }}
              className="px-2 bg-white/[0.06] text-[#949BA4] rounded-lg py-1 text-[11px] font-medium hover:bg-white/[0.10] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {dms.length === 0 && !showNew && (
        <div className="py-6 text-center">
          <p className="text-[#6B6E75] text-xs leading-relaxed">No messages yet.<br />Click + to start a DM.</p>
        </div>
      )}

      {dms.map(dm => {
        const other = dm.other
        const name = other ? (other.displayName ?? other.username) : '?'
        const color = other?.avatarColor ?? avatarColor(other?.username)
        const active = dm.id === dmId
        const dmUnread = unread?.dms?.[dm.id] ?? 0
        return (
          <button key={dm.id} onClick={() => navigate(`/voxa/me/dms/${dm.id}`)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors text-left',
              active ? 'bg-white/[0.10]' : 'hover:bg-white/[0.06]'
            )}>
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                style={{ background: other?.avatarUrl ? undefined : color }}>
                {other?.avatarUrl
                  ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : name[0]?.toUpperCase()}
              </div>
              {dmUnread > 0 && !active && (
                <div className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#E53935] border-2 border-[#2B2D31] flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold leading-none">{dmUnread > 99 ? '99+' : dmUnread}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={clsx('text-sm font-medium truncate leading-tight',
                active ? 'text-white' : dmUnread > 0 ? 'text-white' : 'text-[#949BA4]')}>
                {name}
              </div>
              {dm.lastMessage && (
                <div className={clsx('text-[10px] truncate leading-tight',
                  dmUnread > 0 && !active ? 'text-[#DBDEE1] font-medium' : 'text-[#6B6E75]')}>
                  {dm.lastMessage.content}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ServerChannels({ server, channelId, navigate, serverId, onAddChannel, unread }) {
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
          unread={unread}
        />
      ))}
    </div>
  )
}

function Category({ cat, channelId, navigate, serverId, onAddChannel, unread }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="mb-1">
      <div className="flex items-center px-3 py-1 group">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-1 flex-1 text-[#6B6E75] hover:text-[#949BA4] transition-colors"
        >
          {collapsed
            ? <ChevronRight size={10} className="shrink-0" />
            : <ChevronDown size={10} className="shrink-0" />}
          <span className="text-[10px] font-bold uppercase tracking-wider ml-0.5">{cat.name}</span>
        </button>
        <button
          onClick={onAddChannel}
          className="opacity-0 group-hover:opacity-100 text-[#6B6E75] hover:text-[#DBDEE1] transition-all"
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
          unreadCount={unread?.channels?.[ch.id] ?? 0}
        />
      ))}
    </div>
  )
}

function ChannelRow({ ch, active, navigate, serverId, unreadCount }) {
  const isVoice = ch.type === 'voice'
  const Icon = isVoice ? Volume2 : Hash
  const hasUnread = !isVoice && unreadCount > 0 && !active
  return (
    <div
      onClick={() => !isVoice && navigate(`/voxa/servers/${serverId}/channels/${ch.id}`)}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 mx-2 rounded-lg cursor-pointer transition-colors',
        active
          ? 'bg-white/[0.10] text-white'
          : hasUnread
            ? 'text-white hover:bg-white/[0.06]'
            : 'text-[#949BA4] hover:bg-white/[0.06] hover:text-[#DBDEE1]',
        isVoice && 'cursor-default'
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className={clsx('text-sm flex-1 truncate', hasUnread ? 'font-semibold' : 'font-medium')}>{ch.name}</span>
      {ch.locked && <Lock size={11} className="shrink-0 opacity-50" />}
      {hasUnread && (
        <div className="w-2 h-2 rounded-full bg-white shrink-0" />
      )}
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
    <div className="h-14 bg-[#232428] px-3 flex items-center gap-2 shrink-0 border-t border-white/[0.06]">
      <div className="relative cursor-pointer shrink-0" onClick={() => navigate('/voxa/me')}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs overflow-hidden"
          style={{ background: user.avatarUrl ? undefined : color }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : (user.displayName ?? user.username)?.[0]?.toUpperCase()}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#232428]" />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/voxa/me')}>
        <div className="text-xs font-semibold text-[#DBDEE1] truncate leading-tight">
          {user.displayName ?? user.username}
        </div>
        <div className="text-[10px] text-[#6B6E75] truncate">
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
        <PanelBtn label="User Settings" onClick={() => navigate('/voxa/me?settings=1')}>
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
          ? 'bg-[#E53935]/20 text-[#E53935]'
          : 'text-[#6B6E75] hover:bg-white/[0.08] hover:text-[#DBDEE1]'
      )}
    >
      {children}
    </button>
  )
}
