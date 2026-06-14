import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Settings, LogOut, UserCircle, Bell, Shield, Palette, Users, X, Edit3, CheckCircle2, Mail, AlertTriangle, ShieldCheck, ShieldOff, KeyRound, Trash2, Plus, Copy, Download, ArrowLeft, Smartphone, Clock, Lock, Globe, Moon, Sun, Check, Type, MessageSquare, Send, EyeOff, Eye } from 'lucide-react'
import clsx from 'clsx'
import ProfileEditModal from '../components/ProfileEditModal.jsx'
import { api } from '../lib/api.js'
import { useTheme } from '../context/ThemeContext.jsx'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

export default function Me() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showSettings, setShowSettings] = useState(searchParams.get('settings') === '1')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [dms, setDms] = useState(null)
  const [tab, setTab] = useState('messages')
  const [pendingCount, setPendingCount] = useState(0)
  const handleLogout = () => { logout(); navigate('/') }

  useEffect(() => {
    api.getDms().then(setDms).catch(() => setDms([]))
  }, [])

  if (showSettings) return <SettingsPanel user={user} onClose={() => { setShowSettings(false); navigate('/voxa/me', { replace: true }) }} onLogout={handleLogout} onEditProfile={() => { setShowSettings(false); setShowEditProfile(true) }} />

  const color = user?.avatarColor ?? avatarColor(user?.username)

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {showEditProfile && <ProfileEditModal onClose={() => setShowEditProfile(false)} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && !user.emailVerified && (
          <VerifyBanner onSettings={() => setShowSettings(true)} />
        )}
        <div className="h-12 px-2 flex items-center gap-1 border-b border-[#E3E5E8] shrink-0 bg-white">
          <button onClick={() => setTab('messages')}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === 'messages' ? 'text-[#1A1B1E] bg-[#F2F3F5]' : 'text-[#96989D] hover:text-[#1A1B1E] hover:bg-[#F7F8FA]'}`}>
            <MessageSquare size={13} /> Messages
          </button>
          <button onClick={() => setTab('friends')}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === 'friends' ? 'text-[#1A1B1E] bg-[#F2F3F5]' : 'text-[#96989D] hover:text-[#1A1B1E] hover:bg-[#F7F8FA]'}`}>
            <Users size={13} /> Friends
            {pendingCount > 0 && (
              <span className="bg-[#E53935] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">{pendingCount}</span>
            )}
          </button>
          <div className="flex-1" />
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-[#5C6068] hover:text-[#1A1B1E] text-xs font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F2F3F5]">
            <Settings size={14} /> Settings
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollable">
          {tab === 'messages'
            ? <DmHome dms={dms} navigate={navigate} user={user} />
            : <FriendsHome user={user} navigate={navigate} onPendingCount={setPendingCount} />}
        </div>
      </div>

      {/* Right panel — profile card */}
      <div className="w-72 border-l border-[#E3E5E8] hidden xl:flex flex-col overflow-y-auto scrollable p-5 gap-5">
        <ProfileCard user={user} onEdit={() => setShowEditProfile(true)} />
      </div>
    </div>
  )
}

function DmHome({ dms, navigate, user }) {
  const [showNew, setShowNew] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newError, setNewError] = useState('')
  const [newLoading, setNewLoading] = useState(false)

  const openNewDm = async (e) => {
    e.preventDefault()
    const name = newUsername.trim()
    if (!name) return
    setNewLoading(true); setNewError('')
    try {
      const dm = await api.openDm(undefined, name)
      navigate(`/voxa/me/dms/${dm.id}`)
    } catch (err) {
      setNewError(err.message)
    } finally { setNewLoading(false) }
  }

  const DMCOLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
  const dmColor = (name) => DMCOLORS[(name?.charCodeAt(0) ?? 0) % DMCOLORS.length]

  if (dms === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full p-6">
      {/* New DM button */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-black text-[#1A1B1E]">Messages</h2>
          <p className="text-xs text-[#96989D] mt-0.5">Start a conversation with anyone on Voxa</p>
        </div>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
          <Send size={13} /> New Message
        </button>
      </div>

      {/* New DM form */}
      {showNew && (
        <form onSubmit={openNewDm} className="mb-5 bg-[#FFF5F5] border border-[#FECDD3] rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-[#1A1B1E] uppercase tracking-wider">Start a conversation</div>
          <input
            value={newUsername}
            onChange={e => { setNewUsername(e.target.value); setNewError('') }}
            placeholder="Enter a username (e.g. alice)"
            autoFocus
            className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
          />
          {newError && <p className="text-[#E53935] text-xs">{newError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={newLoading || !newUsername.trim()}
              className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors">
              {newLoading ? 'Opening…' : 'Open DM'}
            </button>
            <button type="button" onClick={() => { setShowNew(false); setNewError(''); setNewUsername('') }}
              className="text-[#5C6068] hover:text-[#1A1B1E] text-xs font-medium transition-colors px-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* DM list */}
      {dms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F2F3F5] flex items-center justify-center border border-[#E3E5E8]">
            <MessageSquare size={28} className="text-[#96989D]" />
          </div>
          <div>
            <p className="text-[#1A1B1E] font-bold text-sm mb-1">No messages yet</p>
            <p className="text-[#96989D] text-xs max-w-[220px] leading-relaxed">Send a message to start a private conversation with someone.</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="bg-[#E53935] hover:bg-[#C62828] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Start a conversation
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-3">Recent Conversations</div>
          {dms.map(dm => {
            const other = dm.participants?.find(p => p.id !== user?.id) ?? dm.participants?.[0]
            const name = other?.displayName ?? other?.username ?? 'Unknown'
            const bg = other?.avatarColor ?? dmColor(other?.username)
            const lastMsg = dm.lastMessage
            return (
              <button key={dm.id} onClick={() => navigate(`/voxa/me/dms/${dm.id}`)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F7F8FA] transition-colors text-left group">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden"
                  style={{ background: other?.avatarUrl ? undefined : bg }}>
                  {other?.avatarUrl
                    ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1A1B1E] text-sm truncate">{name}</span>
                    <span className="text-[#96989D] text-xs truncate">@{other?.username}</span>
                  </div>
                  {lastMsg && (
                    <div className="text-xs text-[#96989D] truncate mt-0.5">{lastMsg.content}</div>
                  )}
                </div>
                <div className="shrink-0 text-[#96989D] group-hover:text-[#5C6068] transition-colors">
                  <ArrowLeft size={13} className="rotate-180" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProfileCard({ user, onEdit }) {
  const color = user?.avatarColor ?? avatarColor(user?.username)
  const bannerBg = user?.bannerColor ?? color
  return (
    <div className="rounded-2xl overflow-hidden border border-[#E3E5E8]">
      <div className="h-14 transition-colors" style={{ background: user?.bannerUrl ? undefined : bannerBg }}>
        {user?.bannerUrl && <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover" />}
      </div>
      <div className="px-4 pb-4 bg-white -mt-6">
        <div className="flex items-end justify-between">
          <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center font-black text-white text-2xl overflow-hidden"
            style={{ background: user?.avatarUrl ? undefined : color }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : (user?.displayName ?? user?.username)?.[0]?.toUpperCase()}
          </div>
          {onEdit && (
            <button onClick={onEdit}
              className="mb-1 text-xs font-semibold text-white bg-[#E53935] hover:bg-[#C62828] px-3 py-1.5 rounded-xl transition-colors">
              Edit
            </button>
          )}
        </div>
        <div className="mt-2">
          <div className="font-bold text-[#1A1B1E] text-sm">{user?.displayName ?? user?.username}</div>
          <div className="text-[#96989D] text-xs">#{user?.discriminator}</div>
          {user?.customStatus && <div className="text-[#5C6068] text-xs mt-0.5 italic">{user.customStatus}</div>}
        </div>
        {user?.bio && (
          <>
            <div className="h-px bg-[#E3E5E8] my-3" />
            <p className="text-xs text-[#5C6068] leading-relaxed">{user.bio}</p>
          </>
        )}
        <div className="h-px bg-[#E3E5E8] my-3" />
        <div className="text-xs text-[#5C6068]">
          <span className="font-semibold text-[#1A1B1E]">Member since</span>
          <div className="mt-0.5">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
        </div>
      </div>
    </div>
  )
}

function EmptyFriends({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-20 h-20 rounded-2xl bg-[#F2F3F5] flex items-center justify-center border border-[#E3E5E8]">
        <Users size={32} className="text-[#96989D]" />
      </div>
      <div className="text-center">
        <p className="text-[#1A1B1E] font-bold text-sm mb-1">No {tab.toLowerCase()} friends</p>
        <p className="text-[#96989D] text-xs">Your friend list is empty. Say hi to someone!</p>
      </div>
    </div>
  )
}

function AddFriend({ onSent }) {
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    const name = val.trim()
    if (!name) return
    setLoading(true); setError(''); setSuccess('')
    try {
      await api.sendFriendRequest(name)
      setSuccess(`Friend request sent to ${name}!`)
      setVal('')
      onSent?.()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-8 max-w-xl">
      <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Add a friend</h2>
      <p className="text-[#5C6068] text-sm mb-5">Add friends using their Voxa username.</p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input value={val} onChange={e => { setVal(e.target.value); setError(''); setSuccess('') }}
          placeholder="Enter a username"
          className="flex-1 bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] transition-all"
        />
        <button type="submit" disabled={!val.trim() || loading}
          className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors shrink-0">
          {loading ? 'Sending…' : 'Send request'}
        </button>
      </form>
      {error && <p className="mt-3 text-[#E53935] text-sm">{error}</p>}
      {success && <p className="mt-3 text-[#10B981] text-sm">{success}</p>}
    </div>
  )
}

const FRIEND_COLORS = ['#E53935','#6366F1','#10B981','#F59E0B','#3B82F6','#8B5CF6','#EC4899']
const fcol = (n) => FRIEND_COLORS[(n?.charCodeAt(0) ?? 0) % FRIEND_COLORS.length]

function FriendsHome({ user, navigate, onPendingCount }) {
  const [ftab, setFtab] = useState('all')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [f, r] = await Promise.all([api.getFriends(), api.getFriendRequests()])
      setFriends(f ?? [])
      setRequests(r ?? [])
      onPendingCount?.((r ?? []).filter(req => req.incoming).length)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const incoming = requests.filter(r => r.incoming)
  const outgoing = requests.filter(r => !r.incoming)

  const accept = async (req) => { try { await api.acceptFriendRequest(req.id); load() } catch {} }
  const decline = async (req) => { try { await api.declineFriendRequest(req.id); load() } catch {} }
  const remove = async (f) => { try { await api.removeFriend(f.user.id); load() } catch {} }

  const openDm = async (userId) => { navigate(`/voxa/me/dms/${userId}`) }

  const TABS = [
    { id: 'all', label: 'All Friends' },
    { id: 'pending', label: 'Pending', badge: incoming.length },
    { id: 'add', label: 'Add Friend' },
  ]

  return (
    <div className="max-w-2xl mx-auto w-full p-5">
      <div className="flex items-center gap-1 mb-5 border-b border-[#E3E5E8] pb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setFtab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors
              ${ftab === t.id ? 'bg-[#F2F3F5] text-[#1A1B1E]' : 'text-[#96989D] hover:text-[#1A1B1E] hover:bg-[#F7F8FA]'}`}>
            {t.label}
            {t.badge > 0 && (
              <span className="bg-[#E53935] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ftab === 'all' ? (
        friends.length === 0 ? <EmptyFriends tab="All" /> : (
          <div className="space-y-0.5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-2">All Friends — {friends.length}</div>
            {friends.map(f => {
              const u = f.user; const bg = u.avatarColor ?? fcol(u.username)
              return (
                <div key={f.requestId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F7F8FA] transition-colors group">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ background: bg }}>
                    {(u.displayName ?? u.username)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1A1B1E] text-sm">{u.displayName ?? u.username}</div>
                    <div className="text-[#96989D] text-xs">@{u.username}#{u.discriminator}</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openDm(u.id)}
                      className="p-2 rounded-lg bg-[#F2F3F5] hover:bg-[#E3E5E8] text-[#5C6068] transition-colors">
                      <MessageSquare size={13} />
                    </button>
                    <button onClick={() => remove(f)}
                      className="p-2 rounded-lg bg-[#F2F3F5] hover:bg-red-50 text-[#96989D] hover:text-[#E53935] transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : ftab === 'pending' ? (
        (incoming.length === 0 && outgoing.length === 0) ? <EmptyFriends tab="Pending" /> : (
          <div className="space-y-4">
            {incoming.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-2">Incoming — {incoming.length}</div>
                <div className="space-y-0.5">
                  {incoming.map(r => {
                    const u = r.user; const bg = u.avatarColor ?? fcol(u.username)
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F7F8FA]">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: bg }}>
                          {(u.displayName ?? u.username)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1A1B1E] text-sm">{u.displayName ?? u.username}</div>
                          <div className="text-[#96989D] text-xs">Incoming request</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => accept(r)} className="p-2 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] transition-colors"><Check size={13} /></button>
                          <button onClick={() => decline(r)} className="p-2 rounded-lg bg-[#F2F3F5] hover:bg-red-50 text-[#96989D] hover:text-[#E53935] transition-colors"><X size={13} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {outgoing.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-2">Outgoing — {outgoing.length}</div>
                <div className="space-y-0.5">
                  {outgoing.map(r => {
                    const u = r.user; const bg = u.avatarColor ?? fcol(u.username)
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F7F8FA]">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: bg }}>
                          {(u.displayName ?? u.username)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1A1B1E] text-sm">{u.displayName ?? u.username}</div>
                          <div className="text-[#96989D] text-xs">Outgoing • Pending</div>
                        </div>
                        <button onClick={() => decline(r)} className="p-2 rounded-lg bg-[#F2F3F5] hover:bg-red-50 text-[#96989D] hover:text-[#E53935] transition-colors"><X size={13} /></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <AddFriend onSent={load} />
      )}
    </div>
  )
}

const settingsSections = [
  { id: 'account',       label: 'My Account',       icon: UserCircle },
  { id: 'profile',       label: 'Edit Profile',      icon: Edit3 },
  { id: 'appearance',    label: 'Appearance',         icon: Palette },
  { id: 'notifications', label: 'Notifications',      icon: Bell },
  { id: 'privacy',       label: 'Privacy & Safety',   icon: Shield },
]

function SettingsPanel({ user, onClose, onLogout, onEditProfile }) {
  const [section, setSection] = useState('account')
  const current = settingsSections.find(s => s.id === section)
  return (
    <div className="flex-1 flex overflow-hidden bg-[#F7F8FA]">
      {/* Sidebar — matches ServerSidebar dark style */}
      <div className="m-2 w-[210px] bg-[#111214] rounded-2xl shadow-2xl shrink-0 flex flex-col overflow-hidden border border-white/[0.05]">
        <div className="px-3 pt-4 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 px-2 mb-3">User Settings</div>
          {settingsSections.map(s => (
            <button key={s.id}
              onClick={() => s.id === 'profile' ? onEditProfile() : setSection(s.id)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all text-left mb-0.5',
                section === s.id && s.id !== 'profile'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
              )}>
              <s.icon size={14} className="shrink-0" />
              {s.label}
            </button>
          ))}
        </div>
        <div className="mx-3 h-px bg-white/[0.06]" />
        <div className="px-3 py-2">
          <button onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all text-left text-[#E53935]/80 hover:text-[#E53935] hover:bg-white/[0.05]">
            <LogOut size={14} className="shrink-0" /> Log Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollable bg-white rounded-2xl m-2 ml-0 border border-[#E3E5E8]">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-black text-[#1A1B1E]">{current?.label ?? section}</h1>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors border border-[#E3E5E8]">
              <X size={15} />
            </button>
          </div>
          {section === 'account'       && <AccountSettings user={user} onEditProfile={onEditProfile} />}
          {section === 'appearance'    && <AppearanceSettings />}
          {section === 'notifications' && <NotificationSettings />}
          {section === 'privacy'       && <PrivacySettings />}
        </div>
      </div>
    </div>
  )
}

/* ─── Reusable helpers ────────────────────────────────────────────────────── */
function SectionLabel({ children, className = '' }) {
  return (
    <h3 className={clsx('text-[10px] font-bold uppercase tracking-widest text-[#96989D] mb-3', className)}>
      {children}
    </h3>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative flex items-center w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none',
        !checked && 'bg-[#E3E5E8]'
      )}
      style={checked ? { backgroundColor: 'var(--accent)' } : {}}>
      <span className={clsx(
        'absolute w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )
}

function VerifyBanner({ onSettings }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const resend = async () => {
    setLoading(true)
    try {
      await api.resendVerification()
      setSent(true)
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
      <span className="text-amber-700 text-xs flex-1">
        {sent ? 'Verification email sent — check your inbox.' : 'Please verify your email address to secure your account.'}
      </span>
      {!sent && (
        <button onClick={resend} disabled={loading}
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0 transition-colors disabled:opacity-50">
          {loading ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  )
}

function AccountSettings({ user, onEditProfile }) {
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifySent, setVerifySent] = useState(false)
  const color = user?.avatarColor ?? avatarColor(user?.username)

  const resendVerification = async () => {
    setVerifyLoading(true)
    try {
      await api.resendVerification()
      setVerifySent(true)
    } catch (_) {}
    setVerifyLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-[#E3E5E8]">
        <div className="h-20 transition-colors" style={{ background: user?.bannerUrl ? undefined : (user?.bannerColor ?? color) }}>
          {user?.bannerUrl && <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover" />}
        </div>
        <div className="px-6 pb-5 bg-white -mt-8 flex items-end gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center font-black text-white text-2xl overflow-hidden"
            style={{ background: user?.avatarUrl ? undefined : color }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : (user?.displayName ?? user?.username)?.[0]?.toUpperCase()}
          </div>
          <div className="pb-1 flex-1">
            <div className="font-bold text-[#1A1B1E]">{user?.displayName ?? user?.username}</div>
            <div className="text-[#96989D] text-xs">#{user?.discriminator}</div>
            {user?.customStatus && <div className="text-[#5C6068] text-xs mt-0.5 italic">{user.customStatus}</div>}
          </div>
          <div className="pb-1">
            <button onClick={onEditProfile} className="text-sm font-semibold text-white bg-[#E53935] hover:bg-[#C62828] px-4 py-2 rounded-xl transition-colors">
              Edit profile
            </button>
          </div>
        </div>
      </div>
      {user?.bio && (
        <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-2">Bio</div>
          <p className="text-[#5C6068] text-sm leading-relaxed">{user.bio}</p>
        </div>
      )}
      {[{ label: 'Username', value: `${user?.username}#${user?.discriminator}` }].map(f => (
        <div key={f.label} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1">{f.label}</div>
            <div className="text-[#1A1B1E] text-sm font-medium">{f.value}</div>
          </div>
        </div>
      ))}
      <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', user?.emailVerified ? 'bg-green-100' : 'bg-amber-100')}>
            {user?.emailVerified ? <CheckCircle2 size={16} className="text-green-600" /> : <Mail size={16} className="text-amber-500" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-0.5">Email verification</div>
            <div className="text-[#1A1B1E] text-sm font-medium">{user?.emailVerified ? 'Verified' : 'Not verified'}</div>
          </div>
        </div>
        {!user?.emailVerified && (
          <button onClick={resendVerification} disabled={verifyLoading || verifySent}
            className="shrink-0 text-xs font-semibold text-[#E53935] hover:text-[#C62828] disabled:opacity-50 transition-colors">
            {verifySent ? 'Email sent ✓' : verifyLoading ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="h-px bg-[#E3E5E8] flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#96989D]">Security</span>
        <div className="h-px bg-[#E3E5E8] flex-1" />
      </div>

      <TwoFactorSection user={user} />
      <PasskeySection />

      <div className="flex items-center gap-3 pt-2">
        <div className="h-px bg-[#E3E5E8] flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#96989D]">Login History</span>
        <div className="h-px bg-[#E3E5E8] flex-1" />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="h-px bg-[#E3E5E8] flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#96989D]">Password</span>
        <div className="h-px bg-[#E3E5E8] flex-1" />
      </div>

      <ChangePasswordSection />

      <LoginHistorySection />
    </div>
  )
}

// ─── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    if (form.next !== form.confirm) { setError('New passwords do not match'); return }
    if (form.next.length < 6) { setError('New password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      await api.changePassword(form.current, form.next)
      setSuccess(true)
      setForm({ current: '', next: '', confirm: '' })
      setOpen(false)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#EAEBEE] flex items-center justify-center shrink-0">
            <Lock size={14} className="text-[#5C6068]" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-0.5">Password</div>
            <div className="text-sm font-medium text-[#1A1B1E]">••••••••••••</div>
          </div>
        </div>
        <button onClick={() => { setOpen(v => !v); setError('') }}
          className="text-xs font-semibold text-[#E53935] hover:text-[#C62828] transition-colors">
          {open ? 'Cancel' : 'Change'}
        </button>
      </div>

      {success && (
        <div className="mx-4 mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2.5 rounded-xl">
          <Check size={13} className="shrink-0" /> Password changed successfully.
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="border-t border-[#E3E5E8] px-4 pb-4 pt-4 space-y-3">
          <div className="relative">
            <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Current Password</label>
            <input type={showCurrent ? 'text' : 'password'} value={form.current}
              onChange={e => handle('current', e.target.value)} required autoComplete="current-password"
              className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-8 text-[#96989D] hover:text-[#5C6068] transition-colors">
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">New Password</label>
            <input type={showNext ? 'text' : 'password'} value={form.next}
              onChange={e => handle('next', e.target.value)} required autoComplete="new-password"
              className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
            />
            <button type="button" onClick={() => setShowNext(v => !v)}
              className="absolute right-3 top-8 text-[#96989D] hover:text-[#5C6068] transition-colors">
              {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div>
            <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Confirm New Password</label>
            <input type="password" value={form.confirm}
              onChange={e => handle('confirm', e.target.value)} required autoComplete="new-password"
              className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              <AlertTriangle size={12} className="shrink-0" />{error}
            </div>
          )}
          <button type="submit" disabled={loading || !form.current || !form.next || !form.confirm}
            className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Two-Factor Authentication ─────────────────────────────────────────────────

function TwoFactorSection({ user }) {
  const [enabled, setEnabled] = useState(user?.totpEnabled ?? false)
  const [step, setStep] = useState('idle') // idle | setup-qr | setup-codes | disable-confirm
  const [setupData, setSetupData] = useState(null)
  const [backupCodes, setBackupCodes] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const startSetup = async () => {
    setLoading(true); setError('')
    try {
      const data = await api.setup2FA()
      setSetupData(data)
      setStep('setup-qr')
      setCode('')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const confirmEnable = async () => {
    if (!code.trim()) return
    setLoading(true); setError('')
    try {
      const data = await api.enable2FA(code.trim())
      setBackupCodes(data.backupCodes)
      setEnabled(true)
      setStep('setup-codes')
      setCode('')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const confirmDisable = async () => {
    if (!code.trim()) return
    setLoading(true); setError('')
    try {
      await api.disable2FA(code.trim())
      setEnabled(false)
      setStep('idle')
      setCode('')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const cancel = () => { setStep('idle'); setCode(''); setError(''); setSetupData(null); setBackupCodes(null) }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'voxa-backup-codes.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  if (step === 'setup-qr' && setupData) {
    return (
      <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone size={15} className="text-[#5C6068]" />
          <span className="text-sm font-bold text-[#1A1B1E]">Set up authenticator app</span>
        </div>
        <p className="text-xs text-[#5C6068] leading-relaxed">
          Scan the QR code with Google Authenticator, Authy, or any TOTP app. Then enter the 6-digit code to confirm.
        </p>
        <div className="flex justify-center">
          <img src={setupData.qrCode} alt="QR Code" className="w-40 h-40 rounded-xl border border-[#E3E5E8] bg-white p-2" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1">Manual entry key</div>
          <div className="font-mono text-xs bg-white border border-[#E3E5E8] rounded-xl px-3 py-2 text-[#1A1B1E] select-all break-all">{setupData.secret}</div>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1.5">Verification code</label>
          <input type="text" value={code} onChange={e => setCode(e.target.value)}
            placeholder="000 000" inputMode="numeric" maxLength={8}
            className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935] placeholder:text-[#96989D] font-mono tracking-widest text-center" />
        </div>
        <div className="flex gap-2">
          <button onClick={cancel} className="flex-1 py-2.5 rounded-xl border border-[#E3E5E8] text-[#5C6068] hover:bg-[#EAEBEE] text-sm font-medium transition-colors">Cancel</button>
          <button onClick={confirmEnable} disabled={loading || !code.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-sm font-bold transition-colors">
            {loading ? 'Verifying…' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'setup-codes' && backupCodes) {
    return (
      <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-green-600" />
          <span className="text-sm font-bold text-[#1A1B1E]">2FA enabled! Save your backup codes</span>
        </div>
        <p className="text-xs text-[#5C6068] leading-relaxed">
          Save these 8 backup codes somewhere safe. Each can be used once if you lose access to your authenticator app.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {backupCodes.map(c => (
            <div key={c} className="font-mono text-xs bg-white border border-[#E3E5E8] rounded-lg px-2.5 py-1.5 text-[#1A1B1E] text-center select-all">{c}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={copyBackupCodes}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#E3E5E8] text-[#5C6068] hover:bg-[#EAEBEE] text-xs font-medium transition-colors">
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={downloadBackupCodes}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#E3E5E8] text-[#5C6068] hover:bg-[#EAEBEE] text-xs font-medium transition-colors">
            <Download size={12} /> Download
          </button>
        </div>
        <button onClick={cancel}
          className="w-full py-2.5 rounded-xl bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold transition-colors">
          Done
        </button>
      </div>
    )
  }

  if (step === 'disable-confirm') {
    return (
      <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldOff size={15} className="text-[#E53935]" />
          <span className="text-sm font-bold text-[#1A1B1E]">Disable two-factor authentication</span>
        </div>
        <p className="text-xs text-[#5C6068]">Enter your current 6-digit code or a backup code to confirm.</p>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <input type="text" value={code} onChange={e => setCode(e.target.value)}
          placeholder="000 000 or backup code" inputMode="text" maxLength={13}
          className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935] placeholder:text-[#96989D] font-mono tracking-widest text-center" />
        <div className="flex gap-2">
          <button onClick={cancel} className="flex-1 py-2.5 rounded-xl border border-[#E3E5E8] text-[#5C6068] hover:bg-[#EAEBEE] text-sm font-medium transition-colors">Cancel</button>
          <button onClick={confirmDisable} disabled={loading || !code.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-sm font-bold transition-colors">
            {loading ? 'Disabling…' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', enabled ? 'bg-green-100' : 'bg-[#EAEBEE]')}>
          {enabled ? <ShieldCheck size={16} className="text-green-600" /> : <Shield size={16} className="text-[#96989D]" />}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-0.5">Two-factor authentication</div>
          <div className="text-[#1A1B1E] text-sm font-medium">{enabled ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>
      {enabled ? (
        <button onClick={() => { setStep('disable-confirm'); setCode(''); setError('') }}
          className="text-xs font-semibold text-[#E53935] hover:text-[#C62828] transition-colors shrink-0">
          Disable
        </button>
      ) : (
        <button onClick={startSetup} disabled={loading}
          className="text-xs font-semibold text-[#E53935] hover:text-[#C62828] disabled:opacity-50 transition-colors shrink-0">
          {loading ? 'Loading…' : 'Set up'}
        </button>
      )}
    </div>
  )
}

// ─── Passkeys ─────────────────────────────────────────────────────────────────

function PasskeySection() {
  const [passkeys, setPasskeys] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listPasskeys().then(setPasskeys).catch(() => setPasskeys([]))
  }, [])

  const addPasskey = async () => {
    setLoading(true); setError('')
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const { options, sessionKey } = await api.passkeyRegisterOptions()
      const response = await startRegistration({ optionsJSON: options })
      const ua = navigator.userAgent
      const deviceName = ua.includes('iPhone') ? 'iPhone' : ua.includes('iPad') ? 'iPad' :
        ua.includes('Android') ? 'Android device' : ua.includes('Mac') ? 'Mac' :
        ua.includes('Windows') ? 'Windows device' : 'Passkey'
      await api.passkeyRegister(sessionKey, response, deviceName)
      setPasskeys(await api.listPasskeys())
    } catch (e) {
      if (e.name !== 'NotAllowedError') setError(e.message || 'Registration failed')
    }
    setLoading(false)
  }

  const remove = async (id) => {
    try {
      await api.deletePasskey(id)
      setPasskeys(p => p.filter(pk => pk.id !== id))
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-[#5C6068]" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D]">Passkeys</div>
            <div className="text-xs text-[#5C6068] mt-0.5">Sign in without a password using Face ID, Touch ID, or a hardware key</div>
          </div>
        </div>
        <button onClick={addPasskey} disabled={loading}
          className="flex items-center gap-1 text-xs font-semibold text-[#E53935] hover:text-[#C62828] disabled:opacity-50 transition-colors shrink-0">
          <Plus size={13} /> Add
        </button>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {passkeys === null ? (
        <div className="text-xs text-[#96989D]">Loading…</div>
      ) : passkeys.length === 0 ? (
        <div className="text-xs text-[#96989D]">No passkeys yet. Add one to sign in faster and more securely.</div>
      ) : (
        <div className="space-y-2">
          {passkeys.map(pk => (
            <div key={pk.id} className="flex items-center justify-between bg-white border border-[#E3E5E8] rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <KeyRound size={14} className="text-[#96989D] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1A1B1E] truncate">{pk.deviceName}</div>
                  <div className="text-xs text-[#96989D]">
                    Added {new Date(pk.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {pk.lastUsed && ` · Last used ${new Date(pk.lastUsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </div>
                </div>
              </div>
              <button onClick={() => remove(pk.id)}
                className="ml-2 p-1.5 rounded-lg text-[#96989D] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Login History ────────────────────────────────────────────────────────────

const METHOD_META = {
  password: { label: 'Password login', Icon: Lock, color: 'text-[#5C6068]', bg: 'bg-[#EAEBEE]' },
  '2fa':    { label: 'Two-factor login', Icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-100' },
  passkey:  { label: 'Passkey login', Icon: KeyRound, color: 'text-[#6366F1]', bg: 'bg-indigo-100' },
  register: { label: 'Account created', Icon: CheckCircle2, color: 'text-[#E53935]', bg: 'bg-red-50' },
}

function fmtDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function LoginHistorySection() {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    api.getLoginHistory().then(setHistory).catch(() => setHistory([]))
  }, [])

  return (
    <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={15} className="text-[#5C6068]" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D]">Recent sign-ins</div>
          <div className="text-xs text-[#5C6068] mt-0.5">Last 20 logins to your account</div>
        </div>
      </div>

      {history === null ? (
        <div className="text-xs text-[#96989D]">Loading…</div>
      ) : history.length === 0 ? (
        <div className="text-xs text-[#96989D]">No login history yet.</div>
      ) : (
        <div className="space-y-1.5">
          {history.map((entry, i) => {
            const meta = METHOD_META[entry.method] ?? METHOD_META.password
            const { Icon, color, bg, label } = meta
            return (
              <div key={entry.id}
                className={clsx(
                  'flex items-center gap-3 bg-white border border-[#E3E5E8] rounded-xl px-3 py-2.5',
                  i === 0 && 'ring-1 ring-[#E53935]/20'
                )}>
                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0', bg)}>
                  <Icon size={13} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1A1B1E]">{label}</span>
                    {i === 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#E53935] bg-red-50 px-1.5 py-0.5 rounded-md">Latest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {entry.device && (
                      <span className="text-xs text-[#96989D] flex items-center gap-1">
                        <Smartphone size={10} className="shrink-0" />{entry.device}
                      </span>
                    )}
                    {entry.ip && (
                      <span className="text-xs text-[#96989D] flex items-center gap-1">
                        <Globe size={10} className="shrink-0" />{entry.ip}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-[#96989D] shrink-0 text-right">
                  {fmtDate(entry.createdAt)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Appearance ──────────────────────────────────────────────────────────── */

const ACCENT_PRESETS = [
  { name: 'Red',    color: '#E53935' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Amber',  color: '#F59E0B' },
  { name: 'Green',  color: '#22C55E' },
  { name: 'Teal',   color: '#14B8A6' },
  { name: 'Blue',   color: '#3B82F6' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Purple', color: '#A855F7' },
  { name: 'Pink',   color: '#EC4899' },
  { name: 'Slate',  color: '#64748B' },
]

function AppearanceSettings() {
  const { theme, accentColor, fontSize, messageDisplay, reduceMotion, set } = useTheme()
  const [customHex, setCustomHex] = useState('')
  const [customError, setCustomError] = useState('')

  const applyCustom = () => {
    const hex = customHex.startsWith('#') ? customHex : '#' + customHex
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) { setCustomError('Enter a valid 6-digit hex, e.g. #FF5733'); return }
    set('accentColor', hex)
    setCustomError('')
    setCustomHex('')
  }

  return (
    <div className="space-y-8">

      {/* ── Theme ── */}
      <div>
        <SectionLabel>Theme</SectionLabel>
        <div className="flex gap-3">
          {[{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => set('theme', id)}
              className={clsx('flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-sm font-medium transition-all',
                theme !== id && 'border-[#E3E5E8] bg-[#F7F8FA] text-[#5C6068] hover:bg-[#F2F3F5]')}
              style={theme === id ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)' } : {}}>
              <Icon size={15} />
              {label}
              {theme === id && <Check size={13} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Accent Color ── */}
      <div>
        <SectionLabel>Accent Color</SectionLabel>
        <div className="flex flex-wrap gap-2 mb-3">
          {ACCENT_PRESETS.map(({ name, color }) => (
            <button key={color} title={name} onClick={() => set('accentColor', color)}
              className="w-9 h-9 rounded-xl transition-all hover:scale-110 relative border-2"
              style={{
                background: color,
                borderColor: accentColor === color ? 'var(--accent-dark)' : 'transparent',
                boxShadow: accentColor === color ? `0 0 0 3px ${color}40` : 'none',
              }}>
              {accentColor === color && <Check size={14} className="absolute inset-0 m-auto text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customHex}
            onChange={e => { setCustomHex(e.target.value); setCustomError('') }}
            onKeyDown={e => e.key === 'Enter' && applyCustom()}
            placeholder="#FF5733 — custom hex color"
            className="flex-1 bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none placeholder:text-[#96989D] font-mono"
          />
          <button onClick={applyCustom} className="v-accent-bg text-white px-4 py-2 rounded-xl text-sm font-semibold shrink-0">
            Apply
          </button>
        </div>
        {customError && <p className="text-red-500 text-xs mt-1">{customError}</p>}
        <p className="text-[#96989D] text-xs mt-2">Used for buttons, active states, and highlights throughout the app.</p>
      </div>

      {/* ── Font Size ── */}
      <div>
        <SectionLabel>Chat Font Size</SectionLabel>
        <div className="flex gap-2">
          {[
            { id: 'small',  label: 'Small',   size: '11px' },
            { id: 'medium', label: 'Medium',  size: '13px' },
            { id: 'large',  label: 'Large',   size: '15px' },
            { id: 'xlarge', label: 'X-Large', size: '17px' },
          ].map(({ id, label, size }) => (
            <button key={id} onClick={() => set('fontSize', id)}
              className={clsx('flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                fontSize !== id && 'border-[#E3E5E8] bg-[#F7F8FA] text-[#5C6068] hover:bg-[#F2F3F5]')}
              style={fontSize === id ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)' } : {}}>
              <span style={{ fontSize: size }} className="font-bold leading-none">Aa</span>
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Message Display ── */}
      <div>
        <SectionLabel>Message Display</SectionLabel>
        <div className="flex gap-3">
          {[
            { id: 'cozy',    label: 'Cozy',    desc: 'Avatars shown, spacious layout' },
            { id: 'compact', label: 'Compact', desc: 'Dense layout, no avatars' },
          ].map(({ id, label, desc }) => (
            <button key={id} onClick={() => set('messageDisplay', id)}
              className={clsx('flex-1 text-left px-4 py-3.5 rounded-xl border-2 transition-all',
                messageDisplay !== id && 'border-[#E3E5E8] bg-[#F7F8FA]')}
              style={messageDisplay === id ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-subtle)' } : {}}>
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare size={13} style={messageDisplay === id ? { color: 'var(--accent)' } : { color: '#96989D' }} />
                <span className="font-semibold text-[#1A1B1E] text-sm">{label}</span>
                {messageDisplay === id && <Check size={12} strokeWidth={3} style={{ color: 'var(--accent)' }} />}
              </div>
              <div className="text-[#96989D] text-xs">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Accessibility ── */}
      <div>
        <SectionLabel>Accessibility</SectionLabel>
        <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between">
          <div className="mr-8">
            <div className="font-semibold text-[#1A1B1E] text-sm">Reduce motion</div>
            <div className="text-[#96989D] text-xs mt-0.5">Minimize animations and transitions across the app</div>
          </div>
          <Toggle checked={reduceMotion} onChange={v => set('reduceMotion', v)} />
        </div>
      </div>
    </div>
  )
}

/* ─── Notifications ───────────────────────────────────────────────────────── */

const NOTIF_ITEMS = [
  { key: 'desktop',  label: 'Desktop notifications', desc: 'Get a system notification for new messages',       needsPermission: true, defaultOn: false },
  { key: 'sounds',   label: 'Message sounds',         desc: 'Play a sound when a new message arrives',          needsPermission: false, defaultOn: true  },
  { key: 'preview',  label: 'Message preview',        desc: 'Show message content in desktop notifications',    needsPermission: false, defaultOn: true  },
  { key: 'badge',    label: 'Unread badge',            desc: 'Show unread count on the browser tab title',       needsPermission: false, defaultOn: true  },
  { key: 'mentions', label: 'Mention highlights',      desc: 'Notify when someone mentions your username',       needsPermission: false, defaultOn: true  },
]

function NotificationSettings() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('voxa_notif_prefs') || '{}') } catch { return {} }
  })
  const [permDenied, setPermDenied] = useState(false)

  const toggle = async (key, needsPermission, defaultOn) => {
    const current = prefs[key] ?? defaultOn
    if (!current && needsPermission) {
      if (!('Notification' in window)) return
      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      if (perm !== 'granted') { setPermDenied(true); setTimeout(() => setPermDenied(false), 4000); return }
    }
    const updated = { ...prefs, [key]: !current }
    setPrefs(updated)
    localStorage.setItem('voxa_notif_prefs', JSON.stringify(updated))
  }

  return (
    <div className="space-y-6">
      {permDenied && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={14} className="shrink-0" />
          Browser blocked notifications. Enable them in your browser settings and try again.
        </div>
      )}
      <div>
        <SectionLabel>Notification Preferences</SectionLabel>
        <div className="space-y-2">
          {NOTIF_ITEMS.map(({ key, label, desc, needsPermission, defaultOn }) => (
            <div key={key} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between">
              <div className="mr-8 min-w-0">
                <div className="font-semibold text-[#1A1B1E] text-sm">{label}</div>
                <div className="text-[#96989D] text-xs mt-0.5">{desc}</div>
              </div>
              <Toggle
                checked={prefs[key] ?? defaultOn}
                onChange={() => toggle(key, needsPermission, defaultOn)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#96989D] mb-1">Quiet Hours</div>
        <p className="text-[#5C6068] text-sm">Coming soon — schedule times when Voxa won't send you any notifications.</p>
      </div>
    </div>
  )
}

/* ─── Privacy & Safety ────────────────────────────────────────────────────── */

const PRIVACY_ITEMS = [
  { key: 'showOnline',   label: 'Show online status',      desc: 'Let others see when you are active',                    defaultOn: true  },
  { key: 'allowDMs',     label: 'Allow direct messages',   desc: 'Let members of shared servers send you DMs',             defaultOn: true  },
  { key: 'readReceipts', label: 'Read receipts',           desc: 'Send read receipts in direct message conversations',     defaultOn: true  },
  { key: 'activityStatus', label: 'Activity status',       desc: 'Show what game or app you are currently using',          defaultOn: false },
]

function PrivacySettings() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('voxa_privacy_prefs') || '{}') } catch { return {} }
  })

  const toggle = (key, defaultOn) => {
    const updated = { ...prefs, [key]: !(prefs[key] ?? defaultOn) }
    setPrefs(updated)
    localStorage.setItem('voxa_privacy_prefs', JSON.stringify(updated))
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Privacy Controls</SectionLabel>
        <div className="space-y-2">
          {PRIVACY_ITEMS.map(({ key, label, desc, defaultOn }) => (
            <div key={key} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between">
              <div className="mr-8 min-w-0">
                <div className="font-semibold text-[#1A1B1E] text-sm">{label}</div>
                <div className="text-[#96989D] text-xs mt-0.5">{desc}</div>
              </div>
              <Toggle checked={prefs[key] ?? defaultOn} onChange={() => toggle(key, defaultOn)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Data & Usage</SectionLabel>
        <div className="space-y-2">
          {[
            { label: 'Analytics',        desc: 'Help improve Voxa by sharing anonymous usage data' },
            { label: 'Crash reports',    desc: 'Automatically send error reports when Voxa crashes' },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between">
              <div className="mr-8">
                <div className="font-semibold text-[#1A1B1E] text-sm">{label}</div>
                <div className="text-[#96989D] text-xs mt-0.5">{desc}</div>
              </div>
              <Toggle checked={false} onChange={() => {}} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Note</span>
        </div>
        <p className="text-amber-700 text-xs leading-relaxed">
          These preferences are stored locally on this device. Server-side enforcement is being added in a future update.
        </p>
      </div>
    </div>
  )
}
