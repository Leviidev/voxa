import { useParams, useNavigate } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight, Mic, Headphones, Settings, Plus, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useServers } from '../context/ServersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import CreateChannelModal from './CreateChannelModal.jsx'
import ServerSettingsModal from './ServerSettingsModal.jsx'
import clsx from 'clsx'
import { api } from '../lib/api.js'

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
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#96989D]">Direct Messages</p>
        <button onClick={() => setShowNew(v => !v)}
          className="text-[#96989D] hover:text-[#5C6068] transition-colors" title="New DM">
          <Plus size={13} />
        </button>
      </div>

      {showNew && (
        <form onSubmit={openNewDm} className="mx-1 mb-2">
          <input
            autoFocus
            value={newUsername}
            onChange={e => { setNewUsername(e.target.value); setNewError('') }}
            placeholder="Enter username"
            className="w-full bg-white border border-[#E3E5E8] focus:border-[#E53935] rounded-lg px-3 py-1.5 text-xs text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors"
          />
          {newError && <p className="text-[10px] text-[#E53935] mt-1 px-1">{newError}</p>}
          <div className="flex gap-1 mt-1">
            <button type="submit" disabled={newLoading || !newUsername.trim()}
              className="flex-1 bg-[#E53935] disabled:opacity-40 text-white rounded-lg py-1 text-[11px] font-semibold transition-colors hover:bg-[#C62828]">
              {newLoading ? '…' : 'Open DM'}
            </button>
            <button type="button" onClick={() => { setShowNew(false); setNewUsername(''); setNewError('') }}
              className="px-2 bg-[#F2F3F5] text-[#5C6068] rounded-lg py-1 text-[11px] font-medium hover:bg-[#EAEBEE] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {dms.length === 0 && !showNew && (
        <div className="py-6 text-center">
          <p className="text-[#96989D] text-xs leading-relaxed">No messages yet.<br />Click + to start a DM.</p>
        </div>
      )}

      {dms.map(dm => {
        const other = dm.other
        const name = other ? (other.displayName ?? other.username) : '?'
        const color = other?.avatarColor ?? avatarColor(other?.username)
        const active = dm.id === dmId
        return (
          <button key={dm.id} onClick={() => navigate(`/voxa/me/dms/${dm.id}`)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors text-left',
              active ? 'bg-[#E0E2E6]' : 'hover:bg-[#EAEBEE]'
            )}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden"
              style={{ background: other?.avatarUrl ? undefined : color }}>
              {other?.avatarUrl
                ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                : name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className={clsx('text-sm font-medium truncate leading-tight', active ? 'text-[#1A1B1E]' : 'text-[#5C6068]')}>
                {name}
              </div>
              {dm.lastMessage && (
                <div className="text-[10px] text-[#96989D] truncate leading-tight">
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
