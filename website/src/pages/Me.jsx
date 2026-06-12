import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, UserCircle, Bell, Shield, Palette, Users, X, Edit3, CheckCircle2, Mail, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import ProfileEditModal from '../components/ProfileEditModal.jsx'
import { api } from '../lib/api.js'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
const friendTabs = ['Online', 'All', 'Add Friend']

export default function Me() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Online')
  const [showSettings, setShowSettings] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const handleLogout = () => { logout(); navigate('/') }
  if (showSettings) return <SettingsPanel user={user} onClose={() => setShowSettings(false)} onLogout={handleLogout} onEditProfile={() => { setShowSettings(false); setShowEditProfile(true) }} />
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {showEditProfile && <ProfileEditModal onClose={() => setShowEditProfile(false)} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && !user.emailVerified && (
          <VerifyBanner onSettings={() => setShowSettings(true)} />
        )}
        <div className="h-12 px-4 flex items-center gap-3 border-b border-[#E3E5E8] shrink-0 bg-white">
          <Users size={17} className="text-[#96989D]" />
          <span className="font-bold text-[#1A1B1E] text-sm">Friends</span>
          <div className="w-px h-4 bg-[#E3E5E8] mx-1" />
          <div className="flex items-center gap-1">
            {friendTabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  activeTab === t ? 'bg-[#E0E2E6] text-[#1A1B1E]' : 'text-[#5C6068] hover:bg-[#F2F3F5] hover:text-[#1A1B1E]',
                  t === 'Add Friend' && activeTab !== t && 'text-[#23a55a]')}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-[#5C6068] hover:text-[#1A1B1E] text-xs font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F2F3F5]">
            <Settings size={14} /> Settings
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollable">
          {activeTab === 'Add Friend' ? <AddFriend /> : <EmptyFriends tab={activeTab} />}
        </div>
      </div>
      <div className="w-80 border-l border-[#E3E5E8] hidden xl:flex flex-col overflow-y-auto scrollable">
        <div className="p-5 border-b border-[#E3E5E8]">
          <h3 className="font-bold text-[#1A1B1E] text-sm mb-4">Active Now</h3>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F2F3F5] flex items-center justify-center border border-[#E3E5E8]">
              <Users size={22} className="text-[#96989D]" />
            </div>
            <p className="text-[#1A1B1E] font-bold text-sm">It's quiet for now</p>
            <p className="text-[#96989D] text-xs max-w-[180px] leading-relaxed">When a friend is active, you'll see it here.</p>
          </div>
        </div>
        {user && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1B1E] text-sm">Your profile</h3>
              <button onClick={() => setShowEditProfile(true)}
                className="flex items-center gap-1 text-xs text-[#5C6068] hover:text-[#1A1B1E] bg-[#F2F3F5] hover:bg-[#EAEBEE] px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                <Edit3 size={11} /> Edit
              </button>
            </div>
            <ProfileCard user={user} />
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileCard({ user }) {
  const color = user?.avatarColor ?? avatarColor(user?.username)
  const bannerBg = user?.bannerColor ?? color
  return (
    <div className="rounded-2xl overflow-hidden border border-[#E3E5E8]">
      <div className="h-14 transition-colors" style={{ background: user?.bannerUrl ? undefined : bannerBg }}>
        {user?.bannerUrl && <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover" />}
      </div>
      <div className="px-4 pb-4 bg-white -mt-6">
        <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center font-black text-white text-2xl overflow-hidden"
          style={{ background: user?.avatarUrl ? undefined : color }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : (user?.displayName ?? user?.username)?.[0]?.toUpperCase()}
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

function AddFriend() {
  const [val, setVal] = useState('')
  return (
    <div className="p-8 max-w-xl">
      <h2 className="text-xl font-black text-[#1A1B1E] mb-1">Add a friend</h2>
      <p className="text-[#5C6068] text-sm mb-5">Add friends using their Voxa username.</p>
      <form onSubmit={e => e.preventDefault()} className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="Enter a username"
          className="flex-1 bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] transition-all"
        />
        <button type="submit" className="bg-[#E53935] hover:bg-[#C62828] text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors shrink-0">
          Send request
        </button>
      </form>
    </div>
  )
}

const settingsSections = [
  { id: 'account', label: 'My Account', icon: UserCircle },
  { id: 'profile', label: 'Edit Profile', icon: Edit3 },
  { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

function SettingsPanel({ user, onClose, onLogout, onEditProfile }) {
  const [section, setSection] = useState('account')
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <div className="w-56 bg-[#F7F8FA] border-r border-[#E3E5E8] overflow-y-auto scrollable py-4 px-2 shrink-0">
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] px-2 mb-2">User Settings</div>
        {settingsSections.map(s => (
          <button key={s.id}
            onClick={() => s.id === 'profile' ? onEditProfile() : setSection(s.id)}
            className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
              section === s.id ? 'bg-[#E0E2E6] text-[#1A1B1E]' : 'text-[#5C6068] hover:bg-[#EAEBEE] hover:text-[#1A1B1E]')}>
            <s.icon size={15} />{s.label}
          </button>
        ))}
        <div className="h-px bg-[#E3E5E8] my-3 mx-2" />
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-[#E53935] hover:bg-[#E53935]/10 transition-colors">
          <LogOut size={15} /> Log Out
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollable">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-black text-[#1A1B1E] capitalize">{settingsSections.find(s => s.id === section)?.label ?? section}</h1>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors border border-[#E3E5E8]">
              <X size={15} />
            </button>
          </div>
          {section === 'account' && <AccountSettings user={user} onEditProfile={onEditProfile} />}
          {section === 'notifications' && <NotificationSettings />}
          {section === 'appearance' && <AppearanceSettings />}
          {!['account', 'notifications', 'appearance'].includes(section) && (
            <p className="text-[#96989D] text-sm">This section is coming soon.</p>
          )}
        </div>
      </div>
    </div>
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
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            user?.emailVerified ? 'bg-green-100' : 'bg-amber-100'
          )}>
            {user?.emailVerified
              ? <CheckCircle2 size={16} className="text-green-600" />
              : <Mail size={16} className="text-amber-500" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-0.5">Email verification</div>
            <div className="text-[#1A1B1E] text-sm font-medium">
              {user?.emailVerified ? 'Verified' : 'Not verified'}
            </div>
          </div>
        </div>
        {!user?.emailVerified && (
          <button onClick={resendVerification} disabled={verifyLoading || verifySent}
            className="shrink-0 text-xs font-semibold text-[#E53935] hover:text-[#C62828] disabled:opacity-50 transition-colors">
            {verifySent ? 'Email sent ✓' : verifyLoading ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-3">
      {[
        { label: 'Desktop notifications', desc: 'Get notified when you receive a message' },
        { label: 'Unread badge', desc: 'Show a badge on the browser tab' },
        { label: 'Message sounds', desc: 'Play sounds for new messages' },
      ].map(s => (
        <div key={s.label} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 flex items-center justify-between">
          <div className="mr-8">
            <div className="font-semibold text-[#1A1B1E] text-sm">{s.label}</div>
            <div className="text-[#96989D] text-xs mt-0.5">{s.desc}</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-10 h-6 bg-[#E3E5E8] peer-checked:bg-[#E53935] rounded-full transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
      ))}
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div>
      <h3 className="font-semibold text-[#1A1B1E] mb-3 text-sm">Theme</h3>
      <div className="flex gap-3 flex-wrap">
        {['Light', 'Dark', 'System'].map(t => (
          <label key={t} className="flex items-center gap-2 bg-[#F7F8FA] border border-[#E3E5E8] px-4 py-3 rounded-xl cursor-pointer hover:bg-[#F2F3F5] transition-colors">
            <input type="radio" name="theme" defaultChecked={t === 'Light'} className="accent-[#E53935]" />
            <span className="text-sm text-[#1A1B1E]">{t}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
