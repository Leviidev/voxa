import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Settings, LogOut, UserCircle, Bell, Shield, Palette, Users, X, Edit3, CheckCircle2, Mail, AlertTriangle, ShieldCheck, ShieldOff, KeyRound, Trash2, Plus, Copy, Download, ArrowLeft, Smartphone, Clock, Lock, Globe, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import ProfileEditModal from '../components/ProfileEditModal.jsx'
import { api } from '../lib/api.js'
import { useTheme } from '../context/ThemeContext.jsx'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
const friendTabs = ['Online', 'All', 'Add Friend']

export default function Me() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('Online')
  const [showSettings, setShowSettings] = useState(searchParams.get('settings') === '1')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const handleLogout = () => { logout(); navigate('/') }
  if (showSettings) return <SettingsPanel user={user} onClose={() => { setShowSettings(false); navigate('/voxa/me', { replace: true }) }} onLogout={handleLogout} onEditProfile={() => { setShowSettings(false); setShowEditProfile(true) }} />
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

      <LoginHistorySection />
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
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <h3 className="font-semibold text-[#1A1B1E] mb-3 text-sm">Theme</h3>
      <div className="flex gap-3 flex-wrap">
        {[
          { id: 'light', label: 'Light', icon: Sun },
          { id: 'dark', label: 'Dark', icon: Moon },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTheme(id)}
            className={clsx(
              'flex items-center gap-2.5 px-5 py-3.5 rounded-xl border-2 text-sm font-medium transition-all',
              theme === id
                ? 'border-[#E53935] bg-red-50 text-[#E53935]'
                : 'border-[#E3E5E8] bg-[#F7F8FA] text-[#5C6068] hover:bg-[#F2F3F5] hover:text-[#1A1B1E]'
            )}>
            <Icon size={16} />
            {label}
            {theme === id && <CheckCircle2 size={14} className="ml-1" />}
          </button>
        ))}
      </div>
      <p className="text-[#96989D] text-xs mt-3">
        The theme applies immediately and is saved for your next visit.
      </p>
    </div>
  )
}
