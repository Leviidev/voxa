import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { MOCK_DMS } from '../data/mockData.js'
import { Settings, LogOut, UserCircle, Bell, Shield, Palette, CreditCard, MessageSquare, Users, AtSign, X, Edit3 } from 'lucide-react'
import clsx from 'clsx'

const tabs = ['Online', 'All', 'Pending', 'Blocked', 'Add Friend']

export default function Me() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Online')
  const [activeSection, setActiveSection] = useState('friends')
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  if (showSettings) return <SettingsPanel user={user} onClose={() => setShowSettings(false)} onLogout={handleLogout} />

  return (
    <div className="flex-1 flex overflow-hidden bg-voxa-chat">
      {/* Friends main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 flex items-center gap-3 border-b border-black/20 shrink-0">
          <Users size={18} className="text-voxa-text-muted" />
          <span className="font-semibold text-voxa-header text-sm">Friends</span>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <div className="flex items-center gap-1">
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={clsx(
                  'px-3 py-1 rounded text-sm font-medium transition-colors',
                  activeTab === t
                    ? 'bg-voxa-selected text-voxa-header'
                    : 'text-voxa-text-muted hover:bg-voxa-hover hover:text-voxa-header',
                  t === 'Add Friend' ? '!text-green-400 hover:!bg-green-400/10 hover:!text-green-300' : ''
                )}>{t}</button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-voxa-text-muted hover:text-voxa-header text-xs font-medium transition-colors px-2 py-1 rounded hover:bg-voxa-hover">
            <Settings size={14} /> Settings
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollable">
          {activeTab === 'Add Friend' ? <AddFriend /> : <FriendList tab={activeTab} />}
        </div>
      </div>

      {/* Right: Activity Panel */}
      <div className="w-80 border-l border-black/20 hidden xl:flex flex-col overflow-y-auto scrollable">
        <div className="p-4 border-b border-black/20">
          <h3 className="font-bold text-voxa-header text-sm mb-3">Active Now</h3>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-voxa-sidebar flex items-center justify-center">
              <Users size={24} className="text-voxa-text-dim" />
            </div>
            <p className="text-voxa-header font-semibold text-sm">It's quiet for now...</p>
            <p className="text-voxa-text-muted text-xs">When a friend starts an activity — like playing a game or hanging out on voice — we'll show it here!</p>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-voxa-header text-sm mb-3">Profile</h3>
          <ProfileCard user={user} />
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ user }) {
  if (!user) return null
  const colors = ['#E53935', '#8E24AA', '#1565C0', '#2E7D32', '#E65100']
  const color = colors[user.username?.charCodeAt(0) % colors.length]
  return (
    <div className="bg-voxa-sidebar rounded-xl overflow-hidden">
      <div className="h-16" style={{ background: color }} />
      <div className="px-4 pb-4 -mt-6">
        <div className="w-16 h-16 rounded-full border-4 border-voxa-sidebar flex items-center justify-center font-bold text-white text-2xl"
          style={{ background: color }}>
          {user.username?.[0]?.toUpperCase()}
        </div>
        <div className="mt-2">
          <div className="font-bold text-voxa-header">{user.username}</div>
          <div className="text-voxa-text-muted text-xs">#{user.discriminator}</div>
        </div>
        <div className="h-px bg-white/10 my-3" />
        <div className="text-xs text-voxa-text-muted space-y-1">
          <div><span className="font-semibold text-voxa-header">Member since</span></div>
          <div>{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="h-px bg-white/10 my-3" />
        <div className="text-xs font-semibold text-voxa-header mb-2">Note</div>
        <input placeholder="Click to add a note" className="w-full bg-voxa-input rounded px-2 py-1.5 text-xs text-voxa-header placeholder:text-voxa-text-dim outline-none" />
      </div>
    </div>
  )
}

function FriendList({ tab }) {
  const friends = MOCK_DMS
  const statusColor = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#80848e' }
  const filtered = tab === 'All' ? friends : tab === 'Online' ? friends.filter(f => f.status !== 'offline') : []

  if (!filtered.length) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-voxa-text-muted">
      <Users size={60} className="opacity-20" />
      <p className="text-sm">No {tab.toLowerCase()} friends to show.</p>
    </div>
  )

  return (
    <div className="p-4">
      <div className="text-voxa-text-dim text-xs font-semibold uppercase tracking-wider mb-3">
        {tab} — {filtered.length}
      </div>
      {filtered.map(f => (
        <div key={f.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-voxa-hover group cursor-pointer transition-colors">
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
              style={{ background: statusColor[f.status] === '#23a55a' ? '#E53935' : '#4a4b50' }}>
              {f.username[0]}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-voxa-chat"
              style={{ background: statusColor[f.status] }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-voxa-header text-sm">{f.username}</div>
            <div className="text-voxa-text-dim text-xs capitalize">{f.status}</div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBtn icon={MessageSquare} label="Message" />
            <ActionBtn icon={AtSign} label="More" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AddFriend() {
  const [val, setVal] = useState('')
  return (
    <div className="p-8 max-w-xl">
      <h2 className="text-xl font-bold text-voxa-header mb-1">Add Friend</h2>
      <p className="text-voxa-text-muted text-sm mb-5">You can add friends with their Voxa username.</p>
      <form onSubmit={e => e.preventDefault()} className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)}
          placeholder="You can add friends with their Voxa username"
          className="flex-1 bg-voxa-sidebar-dark text-voxa-header rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-voxa-red/50 placeholder:text-voxa-text-dim border border-white/5"
        />
        <button type="submit"
          className="bg-voxa-red hover:bg-voxa-red-light text-white font-semibold px-4 py-3 rounded-lg text-sm transition-colors">
          Send Friend Request
        </button>
      </form>
      <div className="h-px bg-white/5 my-8" />
      <p className="text-voxa-text-muted text-sm">Voxa is better with friends. Add some!</p>
    </div>
  )
}

function ActionBtn({ icon: Icon, label }) {
  return (
    <button title={label} className="w-9 h-9 rounded-full bg-voxa-sidebar flex items-center justify-center text-voxa-text-muted hover:text-voxa-header hover:bg-voxa-hover transition-colors">
      <Icon size={16} />
    </button>
  )
}

const settingsSections = [
  { id: 'account', label: 'My Account', icon: UserCircle },
  { id: 'profile', label: 'Profiles', icon: Edit3 },
  { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'billing', label: 'Subscriptions', icon: CreditCard },
]

function SettingsPanel({ user, onClose, onLogout }) {
  const [section, setSection] = useState('account')
  return (
    <div className="flex-1 flex overflow-hidden bg-voxa-chat">
      {/* Settings nav */}
      <div className="w-60 bg-voxa-sidebar overflow-y-auto scrollable py-4 px-2 shrink-0">
        <div className="text-voxa-text-dim text-xs font-semibold uppercase tracking-wider px-2 mb-2">User Settings</div>
        {settingsSections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={clsx('w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm font-medium transition-colors text-left',
              section === s.id ? 'bg-voxa-selected text-voxa-header' : 'text-voxa-text-muted hover:bg-voxa-hover hover:text-voxa-header')}>
            <s.icon size={16} />
            {s.label}
          </button>
        ))}
        <div className="h-px bg-white/10 my-3 mx-2" />
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={16} /> Log Out
        </button>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto scrollable">
        <div className="max-w-2xl mx-auto px-10 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-voxa-header capitalize">{section.replace('-', ' ')}</h1>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-voxa-sidebar flex items-center justify-center text-voxa-text-muted hover:text-voxa-header transition-colors">
              <X size={16} />
            </button>
          </div>

          {section === 'account' && <AccountSettings user={user} />}
          {section === 'appearance' && <AppearanceSettings />}
          {section === 'notifications' && <NotificationSettings />}
          {section !== 'account' && section !== 'appearance' && section !== 'notifications' && (
            <div className="text-voxa-text-muted text-sm">Settings for this section coming soon.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountSettings({ user }) {
  return (
    <div className="space-y-6">
      <div className="bg-voxa-sidebar rounded-xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-voxa-red to-voxa-red-dark" />
        <div className="px-6 pb-6 -mt-8 flex items-end gap-4">
          <div className="w-20 h-20 rounded-full border-4 border-voxa-sidebar bg-voxa-red flex items-center justify-center text-white font-black text-3xl">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="pb-2">
            <div className="font-bold text-voxa-header text-lg">{user?.username}</div>
            <div className="text-voxa-text-muted text-sm">#{user?.discriminator}</div>
          </div>
          <div className="ml-auto pb-2">
            <button className="bg-voxa-red hover:bg-voxa-red-light text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Edit User Profile
            </button>
          </div>
        </div>
      </div>

      {[
        { label: 'Username', value: user?.username + '#' + user?.discriminator },
        { label: 'Email', value: user?.email },
        { label: 'Phone Number', value: 'Not set' },
      ].map(f => (
        <div key={f.label} className="bg-voxa-sidebar rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-voxa-text-muted mb-1">{f.label}</div>
            <div className="text-voxa-header text-sm">{f.value}</div>
          </div>
          <button className="text-sm font-semibold text-voxa-header bg-voxa-input hover:bg-voxa-hover px-4 py-1.5 rounded-lg transition-colors">Edit</button>
        </div>
      ))}
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-voxa-header mb-3">Theme</h3>
        <div className="flex gap-3">
          {['Dark', 'Light', 'Sync with computer'].map(t => (
            <label key={t} className="flex items-center gap-2 bg-voxa-sidebar px-4 py-3 rounded-xl cursor-pointer hover:bg-voxa-hover transition-colors">
              <input type="radio" name="theme" defaultChecked={t === 'Dark'} className="accent-voxa-red" />
              <span className="text-sm text-voxa-header">{t}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-voxa-header mb-3">Message Display</h3>
        <div className="flex gap-3">
          {['Cozy', 'Compact'].map(t => (
            <label key={t} className="flex items-center gap-2 bg-voxa-sidebar px-4 py-3 rounded-xl cursor-pointer hover:bg-voxa-hover transition-colors">
              <input type="radio" name="display" defaultChecked={t === 'Cozy'} className="accent-voxa-red" />
              <span className="text-sm text-voxa-header">{t}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-4">
      {[
        { label: 'Enable Desktop Notifications', desc: 'Receive notifications even when Voxa is not in focus.' },
        { label: 'Enable Unread Message Badge', desc: 'Show a badge on the browser tab for unread messages.' },
        { label: 'Enable Sounds', desc: 'Play sounds for incoming messages and calls.' },
      ].map(s => (
        <div key={s.label} className="bg-voxa-sidebar rounded-xl p-4 flex items-center justify-between">
          <div className="mr-8">
            <div className="font-medium text-voxa-header text-sm">{s.label}</div>
            <div className="text-voxa-text-muted text-xs mt-0.5">{s.desc}</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-10 h-6 bg-voxa-input peer-checked:bg-voxa-red rounded-full transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
      ))}
    </div>
  )
}
