import { useState, useEffect } from 'react'
import { X, Settings, Shield, Users, Link2, Trash2, Plus, Check, Copy, AlertTriangle, Edit3, Crown, Hash, Volume2, Smile, Ban, UserCheck } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useServers } from '../context/ServersContext.jsx'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const ROLE_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#3949AB',
  '#1E88E5', '#00897B', '#43A047', '#F4511E',
  '#FB8C00', '#6D4C41', '#546E7A', '#78909C',
]

const ICON_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#3949AB',
  '#1E88E5', '#00897B', '#43A047', '#F4511E',
]

const PERMISSIONS_LIST = [
  { key: 'administrator', label: 'Administrator', desc: 'Full control. Overrides all other permissions.' },
  { key: 'manage_server', label: 'Manage Server', desc: 'Edit server name, icon, and description.' },
  { key: 'manage_roles', label: 'Manage Roles', desc: 'Create, edit, and delete roles below this one.' },
  { key: 'manage_channels', label: 'Manage Channels', desc: 'Create, edit, and delete channels.' },
  { key: 'kick_members', label: 'Kick Members', desc: 'Remove members from the server.' },
  { key: 'ban_members', label: 'Ban Members', desc: 'Permanently ban members from the server.' },
  { key: 'manage_messages', label: 'Manage Messages', desc: 'Delete and pin any message.' },
  { key: 'send_messages', label: 'Send Messages', desc: 'Send messages in text channels.' },
]

const TABS = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'channels', label: 'Channels', icon: Hash },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'bans', label: 'Bans', icon: AlertTriangle },
  { id: 'emojis', label: 'Emojis', icon: Smile },
  { id: 'invites', label: 'Invites', icon: Link2 },
  { id: 'danger', label: 'Danger Zone', icon: Trash2, red: true },
]

export default function ServerSettingsModal({ server: initialServer, onClose }) {
  const { user } = useAuth()
  const { deleteServer, refetch } = useServers()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [server, setServer] = useState(initialServer)

  const refreshServer = async () => {
    try { const s = await api.getServer(server.id); setServer(s) } catch {}
  }

  const isOwner = server?.ownerId === user?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-[#E3E5E8] flex overflow-hidden h-[88vh]">

        {/* Left nav */}
        <div className="w-52 bg-[#F7F8FA] border-r border-[#E3E5E8] py-5 px-3 flex flex-col shrink-0">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] px-2 mb-2 truncate">
            {server?.name}
          </div>
          {TABS.filter(t => t.id !== 'danger' || isOwner).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
                tab === t.id
                  ? t.red ? 'bg-red-50 text-[#E53935]' : 'bg-[#E0E2E6] text-[#1A1B1E]'
                  : t.red ? 'text-[#E53935] hover:bg-red-50' : 'text-[#5C6068] hover:bg-[#EAEBEE] hover:text-[#1A1B1E]')}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E5E8] shrink-0">
            <h2 className="font-black text-[#1A1B1E] text-base">
              {TABS.find(t => t.id === tab)?.label}
            </h2>
            <button onClick={onClose}
              className="w-7 h-7 rounded-xl bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] border border-[#E3E5E8]">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollable">
            {tab === 'overview' && (
              <OverviewTab server={server} isOwner={isOwner} onUpdated={s => { setServer(s); refetch() }} />
            )}
            {tab === 'roles' && (
              <RolesTab server={server} isOwner={isOwner} onRefresh={refreshServer} />
            )}
            {tab === 'members' && (
              <MembersTab server={server} isOwner={isOwner} currentUserId={user?.id} onRefresh={refreshServer} />
            )}
            {tab === 'channels' && (
              <ChannelsTab server={server} isOwner={isOwner} onRefresh={refreshServer} />
            )}
            {tab === 'bans' && (
              <BansTab server={server} isOwner={isOwner} />
            )}
            {tab === 'emojis' && (
              <EmojisTab server={server} isOwner={isOwner} />
            )}
            {tab === 'invites' && (
              <InvitesTab server={server} />
            )}
            {tab === 'danger' && isOwner && (
              <DangerTab server={server} onDelete={() => { deleteServer(server.id); onClose(); navigate('/voxa/me') }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
const DISCOVERY_CATEGORIES = [
  { id: '',          label: 'None (uncategorized)' },
  { id: 'gaming',    label: '🎮 Gaming' },
  { id: 'music',     label: '🎵 Music' },
  { id: 'art',       label: '🎨 Art & Creative' },
  { id: 'tech',      label: '💻 Tech' },
  { id: 'social',    label: '🤝 Social' },
  { id: 'education', label: '📚 Education' },
]

function OverviewTab({ server, isOwner, onUpdated }) {
  const [form, setForm] = useState({
    name: server?.name ?? '',
    iconColor: server?.iconColor ?? '',
    iconUrl: server?.iconUrl ?? '',
    description: server?.description ?? '',
    bannerColor: server?.bannerColor ?? '',
    bannerUrl: server?.bannerUrl ?? '',
    isPublic: server?.isPublic ?? false,
    category: server?.category ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const acronym = form.name ? form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  const iconBg = form.iconColor || '#E53935'

  const save = async () => {
    if (!form.name.trim()) { setError('Server name is required'); return }
    setSaving(true); setError('')
    try {
      const updated = await api.updateServer(server.id, form)
      onUpdated(updated)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {error && <ErrBanner msg={error} />}

      {/* Server icon preview */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl overflow-hidden shrink-0 shadow-md"
          style={{ background: form.iconUrl ? undefined : iconBg }}>
          {form.iconUrl
            ? <img src={form.iconUrl} alt="icon" className="w-full h-full object-cover" />
            : acronym}
        </div>
        <div>
          <div className="text-[#1A1B1E] font-bold text-sm">{form.name || 'Server Name'}</div>
          <div className="text-[#96989D] text-xs mt-0.5">{server?.members?.length ?? 0} member{server?.members?.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <SField label="Server Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required disabled={!isOwner} />

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-2">Icon Color</label>
        <div className="flex flex-wrap gap-2">
          {ICON_COLORS.map(c => (
            <button key={c} onClick={() => isOwner && setForm(f => ({ ...f, iconColor: c }))}
              disabled={!isOwner}
              className={clsx('w-8 h-8 rounded-xl transition-all', form.iconColor === c ? 'ring-2 ring-[#1A1B1E] ring-offset-2 scale-110' : 'hover:scale-105')}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      <SField label="Icon Image URL" placeholder="https://example.com/icon.png"
        value={form.iconUrl} onChange={v => setForm(f => ({ ...f, iconUrl: v }))} disabled={!isOwner}
        hint="Paste a direct image link" />

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          maxLength={300} rows={3} disabled={!isOwner}
          placeholder="What's this server about?"
          className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] resize-none transition-all disabled:opacity-60"
        />
      </div>

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Category</label>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          disabled={!isOwner}
          className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] transition-all disabled:opacity-60 cursor-pointer">
          {DISCOVERY_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <p className="text-[#96989D] text-xs mt-1">Shown on the discovery page when your server is public</p>
      </div>

      {isOwner && (
        <div className="flex items-center justify-between bg-[#F7F8FA] border border-[#E3E5E8] rounded-xl px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-[#1A1B1E]">Public server</div>
            <div className="text-xs text-[#96989D] mt-0.5">Anyone can find and join without an invite</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isPublic}
            onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
            className={`relative flex items-center w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none ${form.isPublic ? 'bg-[#E53935]' : 'bg-[#E3E5E8]'}`}>
            <span className={`absolute w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      )}

      {isOwner && (
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
          {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </div>
  )
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────
function RolesTab({ server, isOwner, onRefresh }) {
  const [roles, setRoles] = useState(server?.roles ?? [])
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newRole, setNewRole] = useState({ name: '', color: ROLE_COLORS[0], permissions: ['send_messages', 'read_messages'] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!newRole.name.trim()) { setError('Role name required'); return }
    setSaving(true); setError('')
    try {
      const role = await api.createRole(server.id, newRole)
      setRoles(prev => [...prev, role])
      setCreating(false)
      setNewRole({ name: '', color: ROLE_COLORS[0], permissions: ['send_messages', 'read_messages'] })
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (roleId) => {
    try {
      await api.deleteRole(server.id, roleId)
      setRoles(prev => prev.filter(r => r.id !== roleId))
      if (editing?.id === roleId) setEditing(null)
    } catch (err) { setError(err.message) }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const updated = await api.updateRole(server.id, editing.id, editing)
      setRoles(prev => prev.map(r => r.id === updated.id ? updated : r))
      setEditing(null)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const togglePerm = (role, setRole, perm) => {
    const perms = role.permissions ?? []
    setRole(r => ({ ...r, permissions: perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm] }))
  }

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-[#5C6068] text-xs">Roles control what members can do.</p>
        {isOwner && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={13} /> New role
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1B1E] uppercase tracking-wider">Create Role</span>
            <button onClick={() => setCreating(false)} className="text-[#96989D] hover:text-[#5C6068]"><X size={14} /></button>
          </div>
          <input value={newRole.name} onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))}
            placeholder="Role name" autoFocus
            className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
          />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1.5">Color</div>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_COLORS.map(c => (
                <button key={c} onClick={() => setNewRole(r => ({ ...r, color: c }))}
                  className={clsx('w-7 h-7 rounded-lg transition-all', newRole.color === c ? 'ring-2 ring-[#1A1B1E] ring-offset-1 scale-110' : 'hover:scale-105')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <PermissionsEditor permissions={newRole.permissions}
            onToggle={(perm) => togglePerm(newRole, setNewRole, perm)} />
          <button onClick={handleCreate} disabled={saving}
            className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      )}

      {/* Role list */}
      <div className="space-y-2">
        {roles.map(role => (
          <div key={role.id}>
            <div className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
              editing?.id === role.id ? 'bg-[#FFF5F5] border-[#FECDD3]' : 'bg-[#F7F8FA] border-[#E3E5E8] hover:bg-[#F2F3F5]'
            )}>
              <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: role.color ?? '#96989D' }} />
              <span className="flex-1 text-sm font-semibold text-[#1A1B1E] truncate">{role.name}</span>
              <span className="text-[#96989D] text-xs hidden sm:block">
                {role.permissions?.length ?? 0} perm{role.permissions?.length !== 1 ? 's' : ''}
              </span>
              {!role.isDefault && isOwner && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(editing?.id === role.id ? null : { ...role })}
                    className="w-7 h-7 rounded-lg hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => handleDelete(role.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#96989D] hover:text-[#E53935] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Inline edit */}
            {editing?.id === role.id && (
              <div className="bg-[#FFF5F5] border border-[#FECDD3] rounded-xl p-4 mt-1 mb-1 space-y-3">
                <input value={editing.name} onChange={e => setEditing(r => ({ ...r, name: e.target.value }))}
                  className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935]"
                />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1.5">Color</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_COLORS.map(c => (
                      <button key={c} onClick={() => setEditing(r => ({ ...r, color: c }))}
                        className={clsx('w-7 h-7 rounded-lg transition-all', editing.color === c ? 'ring-2 ring-[#1A1B1E] ring-offset-1 scale-110' : 'hover:scale-105')}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <PermissionsEditor permissions={editing.permissions ?? []}
                  onToggle={(perm) => setEditing(r => {
                    const perms = r.permissions ?? []
                    return { ...r, permissions: perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm] }
                  })} />
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(null)} className="text-[#5C6068] hover:text-[#1A1B1E] text-xs font-medium transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-center text-[#96989D] text-sm py-6">No roles yet. Create one above.</p>
        )}
      </div>
    </div>
  )
}

function PermissionsEditor({ permissions, onToggle }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-2">Permissions</div>
      <div className="space-y-1.5">
        {PERMISSIONS_LIST.map(p => (
          <label key={p.key} className="flex items-start gap-2.5 cursor-pointer group">
            <div onClick={() => onToggle(p.key)}
              className={clsx('w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer',
                permissions.includes(p.key) ? 'bg-[#E53935]' : 'bg-white border-2 border-[#E3E5E8] group-hover:border-[#E53935]/50')}>
              {permissions.includes(p.key) && <Check size={10} className="text-white" />}
            </div>
            <div onClick={() => onToggle(p.key)}>
              <div className="text-xs font-semibold text-[#1A1B1E]">{p.label}</div>
              <div className="text-[10px] text-[#96989D]">{p.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Channels Tab ─────────────────────────────────────────────────────────────
function ChannelsTab({ server, isOwner, onRefresh }) {
  const [channels, setChannels] = useState(server?.channels ?? [])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [overwriteChannelId, setOverwriteChannelId] = useState(null)

  const startEdit = (ch) => {
    setEditingId(ch.id)
    setEditName(ch.name)
    setError('')
  }

  const cancelEdit = () => { setEditingId(null); setEditName(''); setError('') }

  const saveEdit = async (channelId) => {
    if (!editName.trim()) return
    setSaving(true); setError('')
    try {
      await api.renameChannel(channelId, editName.trim())
      setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, name: editName.trim() } : ch))
      setEditingId(null)
      onRefresh?.()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (channelId, channelName) => {
    if (!window.confirm(`Delete #${channelName}? This will remove all messages in this channel.`)) return
    setSaving(true); setError('')
    try {
      await api.deleteChannel(channelId)
      setChannels(prev => prev.filter(ch => ch.id !== channelId))
      onRefresh?.()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const textChannels = channels.filter(ch => ch.type === 'text')
  const voiceChannels = channels.filter(ch => ch.type === 'voice')

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}

      {[{ label: 'Text Channels', list: textChannels, Icon: Hash }, { label: 'Voice Channels', list: voiceChannels, Icon: Volume2 }].map(({ label, list, Icon }) => (
        list.length > 0 && (
          <div key={label} className="mb-5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-2">{label}</div>
            <div className="space-y-1.5">
              {list.map(ch => (
                <div key={ch.id}>
                  <div className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                    editingId === ch.id ? 'bg-[#FFF5F5] border-[#FECDD3]' : 'bg-[#F7F8FA] border-[#E3E5E8] hover:bg-[#F2F3F5]'
                  )}>
                    <Icon size={14} className="text-[#96989D] shrink-0" />
                    <span className="flex-1 text-sm font-medium text-[#1A1B1E] truncate">{ch.name}</span>
                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setOverwriteChannelId(v => v === ch.id ? null : ch.id)}
                          title="Channel permissions"
                          className={clsx(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                            overwriteChannelId === ch.id
                              ? 'bg-[#E53935]/10 text-[#E53935]'
                              : 'hover:bg-[#EAEBEE] text-[#96989D] hover:text-[#5C6068]'
                          )}>
                          <Shield size={12} />
                        </button>
                        <button onClick={() => editingId === ch.id ? cancelEdit() : startEdit(ch)}
                          className="w-7 h-7 rounded-lg hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => handleDelete(ch.id, ch.name)} disabled={saving}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#96989D] hover:text-[#E53935] transition-colors disabled:opacity-40">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingId === ch.id && (
                    <div className="bg-[#FFF5F5] border border-[#FECDD3] rounded-xl p-3 mt-1 flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(ch.id); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                        className="flex-1 bg-white border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935]"
                      />
                      <button onClick={() => saveEdit(ch.id)} disabled={saving || !editName.trim()}
                        className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shrink-0">
                        {saving ? '…' : 'Save'}
                      </button>
                      <button onClick={cancelEdit} className="text-[#5C6068] text-xs font-medium shrink-0">Cancel</button>
                    </div>
                  )}
                  {overwriteChannelId === ch.id && (
                    <ChannelOverwritePane
                      channel={ch}
                      roles={server?.roles ?? []}
                      onClose={() => setOverwriteChannelId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {channels.length === 0 && (
        <p className="text-center text-[#96989D] text-sm py-8">No channels yet.</p>
      )}

      {!isOwner && (
        <p className="text-xs text-[#96989D] text-center mt-2">Only the server owner can rename or delete channels.</p>
      )}
    </div>
  )
}

// ─── Channel Overwrite Pane ────────────────────────────────────────────────────
const OVERWRITE_PERMS = [
  { key: 'send_messages', label: 'Send Messages' },
  { key: 'read_history', label: 'Read Message History' },
  { key: 'manage_messages', label: 'Manage Messages' },
  { key: 'administrator', label: 'Administrator' },
]

function ChannelOverwritePane({ channel, roles, onClose }) {
  const [overwrites, setOverwrites] = useState([])
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    api.getChannelOverwrites(channel.id).then(setOverwrites).catch(() => {})
  }, [channel.id])

  const getOw = (roleId) => overwrites.find(o => o.roleId === roleId) ?? { allow: [], deny: [] }

  const togglePerm = async (roleId, perm, mode) => {
    setSaving(roleId + perm + mode)
    const ow = getOw(roleId)
    let allow = [...(ow.allow ?? [])]
    let deny = [...(ow.deny ?? [])]
    if (mode === 'allow') {
      allow = allow.includes(perm) ? allow.filter(p => p !== perm) : [...allow.filter(p => p !== perm), perm]
      deny = deny.filter(p => p !== perm)
    } else {
      deny = deny.includes(perm) ? deny.filter(p => p !== perm) : [...deny.filter(p => p !== perm), perm]
      allow = allow.filter(p => p !== perm)
    }
    try {
      const updated = await api.setChannelOverwrite(channel.id, roleId, allow, deny)
      setOverwrites(prev => {
        const idx = prev.findIndex(o => o.roleId === roleId)
        return idx >= 0 ? prev.map((o, i) => i === idx ? updated : o) : [...prev, updated]
      })
    } catch (_) {}
    setSaving(null)
  }

  const allRoles = roles.length > 0 ? roles : []

  return (
    <div className="bg-[#FFF5F5] border border-[#FECDD3] rounded-xl p-4 mt-1.5 mb-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-[#1A1B1E] text-sm">Permissions — #{channel.name}</div>
          <div className="text-[10px] text-[#96989D] mt-0.5">Override role permissions for this channel</div>
        </div>
        <button onClick={onClose} className="text-[#96989D] hover:text-[#1A1B1E] transition-colors">
          <X size={14} />
        </button>
      </div>
      {allRoles.length === 0 && (
        <p className="text-xs text-[#96989D]">No roles found. Create roles in the Roles tab first.</p>
      )}
      {allRoles.map(role => {
        const ow = getOw(role.id)
        return (
          <div key={role.id} className="mb-3 last:mb-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: role.color ?? '#96989D' }} />
              <span className="text-xs font-semibold text-[#1A1B1E]">{role.name}</span>
            </div>
            <div className="space-y-1">
              {OVERWRITE_PERMS.map(({ key, label }) => {
                const allowed = ow.allow?.includes(key)
                const denied = ow.deny?.includes(key)
                const sKey = role.id + key
                return (
                  <div key={key} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#E3E5E8]">
                    <span className="text-xs text-[#5C6068] flex-1">{label}</span>
                    <div className="flex items-center gap-1">
                      <button disabled={saving === sKey + 'allow'} onClick={() => togglePerm(role.id, key, 'allow')}
                        title="Allow"
                        className={clsx('w-6 h-6 rounded text-[11px] font-bold transition-colors border',
                          allowed ? 'bg-green-100 text-green-700 border-green-300' : 'bg-[#F7F8FA] text-[#96989D] border-[#E3E5E8] hover:bg-green-50 hover:text-green-700')}>
                        ✓
                      </button>
                      <button disabled={saving === sKey + 'deny'} onClick={() => togglePerm(role.id, key, 'deny')}
                        title="Deny"
                        className={clsx('w-6 h-6 rounded text-[11px] font-bold transition-colors border',
                          denied ? 'bg-red-100 text-[#E53935] border-red-300' : 'bg-[#F7F8FA] text-[#96989D] border-[#E3E5E8] hover:bg-red-50 hover:text-[#E53935]')}>
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Members Tab ──────────────────────────────────────────────────────────────
function MembersTab({ server, isOwner, currentUserId, onRefresh }) {
  const [members, setMembers] = useState(server?.members ?? [])
  const [roles] = useState(server?.roles ?? [])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedMember, setExpandedMember] = useState(null)
  const [banning, setBanning] = useState(null)
  const [banReason, setBanReason] = useState('')

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    (m.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleKick = async (memberId) => {
    if (!window.confirm('Kick this member? They can rejoin with an invite.')) return
    try {
      await api.kickMember(server.id, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err) { setError(err.message) }
  }

  const handleBan = async (memberId) => {
    try {
      await api.banMember(server.id, memberId, banReason || null)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      setBanning(null); setBanReason('')
    } catch (err) { setError(err.message) }
  }

  const handleAssignRole = async (memberId, roleId) => {
    try {
      await api.assignRole(server.id, memberId, roleId)
      setMembers(prev => prev.map(m => {
        if (m.id !== memberId) return m
        const roleObj = roles.find(r => r.id === roleId)
        return { ...m, roles: [...(m.roles ?? []), roleObj].filter(Boolean) }
      }))
    } catch (err) { setError(err.message) }
  }

  const handleRemoveRole = async (memberId, roleId) => {
    try {
      await api.removeRole(server.id, memberId, roleId)
      setMembers(prev => prev.map(m => {
        if (m.id !== memberId) return m
        return { ...m, roles: (m.roles ?? []).filter(r => r.id !== roleId) }
      }))
    } catch (err) { setError(err.message) }
  }

  const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
  const getColor = (name) => COLORS[name?.charCodeAt(0) % COLORS.length]
  const assignableRoles = (m) => roles.filter(r => !r.isDefault && !(m.roles ?? []).find(mr => mr.id === r.id))

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}
      <div className="mb-4 flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
          className="flex-1 bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
        />
        <span className="text-xs text-[#96989D] shrink-0">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {filtered.map(m => {
          const isExpanded = expandedMember === m.id
          const isBanning = banning === m.id
          const memberRoles = (m.roles ?? []).filter(r => !r.isDefault)
          const available = assignableRoles(m)
          return (
            <div key={m.id} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden"
                  style={{ background: m.avatarUrl ? undefined : (m.avatarColor ?? getColor(m.username)) }}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.displayName ?? m.username)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[#1A1B1E] font-semibold text-sm truncate">{m.displayName ?? m.username}</span>
                    {m.isOwner && <Crown size={11} className="text-[#F59E0B] shrink-0" title="Server Owner" />}
                    {memberRoles.map(r => (
                      <span key={r.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: r.color ?? '#96989D' }}>{r.name}</span>
                    ))}
                  </div>
                  <div className="text-[#96989D] text-xs">@{m.username}#{m.discriminator}</div>
                </div>
                {isOwner && !m.isOwner && m.id !== currentUserId && (
                  <button
                    onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                    className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors shrink-0',
                      isExpanded ? 'bg-[#E53935]/10 text-[#E53935]' : 'bg-[#EAEBEE] text-[#5C6068] hover:bg-[#E0E2E6]')}
                    title="Manage member"
                  >
                    <Edit3 size={13} />
                  </button>
                )}
              </div>

              {isExpanded && isOwner && !m.isOwner && m.id !== currentUserId && (
                <div className="border-t border-[#E3E5E8] bg-white px-3 pb-3 pt-2 space-y-3">
                  {/* Role assignment */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1.5 flex items-center gap-1">
                      <UserCheck size={11} /> Roles
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {memberRoles.map(r => (
                        <button key={r.id} onClick={() => handleRemoveRole(m.id, r.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full text-white transition-opacity hover:opacity-75"
                          style={{ background: r.color ?? '#96989D' }}
                          title="Click to remove">
                          {r.name} <X size={9} />
                        </button>
                      ))}
                      {available.map(r => (
                        <button key={r.id} onClick={() => handleAssignRole(m.id, r.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border-2 border-dashed text-[#5C6068] border-[#C0C2C7] hover:border-[#1A1B1E] hover:text-[#1A1B1E] transition-colors">
                          <Plus size={9} /> {r.name}
                        </button>
                      ))}
                      {roles.filter(r => !r.isDefault).length === 0 && (
                        <span className="text-[10px] text-[#96989D]">No roles created yet — add some in the Roles tab.</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isBanning ? (
                    <div className="flex items-center gap-2 pt-1 border-t border-[#F2F3F5]">
                      <button onClick={() => handleKick(m.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#E53935] hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200">
                        Kick
                      </button>
                      <button onClick={() => setBanning(m.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#E53935] hover:bg-[#C62828] px-3 py-1.5 rounded-lg transition-colors">
                        <Ban size={11} /> Ban
                      </button>
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-[#F2F3F5] space-y-2">
                      <div className="text-xs font-bold text-[#E53935]">Ban {m.displayName ?? m.username}?</div>
                      <input value={banReason} onChange={e => setBanReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#E53935]"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleBan(m.id)}
                          className="flex-1 bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                          Confirm Ban
                        </button>
                        <button onClick={() => { setBanning(null); setBanReason('') }}
                          className="px-3 text-[#5C6068] text-xs font-medium hover:text-[#1A1B1E] transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Bans Tab ─────────────────────────────────────────────────────────────────
function BansTab({ server, isOwner }) {
  const [bans, setBans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOwner) { setLoading(false); return }
    api.getBans(server.id).then(setBans).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [server.id, isOwner])

  const handleUnban = async (userId) => {
    try {
      await api.unbanMember(server.id, userId)
      setBans(prev => prev.filter(b => b.userId !== userId))
    } catch (err) { setError(err.message) }
  }

  const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
  const getColor = (name) => COLORS[name?.charCodeAt(0) % COLORS.length]
  const filtered = bans.filter(b =>
    b.username.toLowerCase().includes(search.toLowerCase()) ||
    (b.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (!isOwner) return (
    <div className="px-6 py-10 text-center text-[#96989D] text-sm">Only the server owner can view bans.</div>
  )

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}
      <div className="flex items-center gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search banned users…"
          className="flex-1 bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
        />
        <span className="text-xs text-[#96989D] shrink-0">{bans.length} ban{bans.length !== 1 ? 's' : ''}</span>
      </div>
      {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" /></div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-10">
          <Ban size={32} className="mx-auto text-[#96989D] mb-2 opacity-40" />
          <p className="text-[#96989D] text-sm">{bans.length === 0 ? 'No bans yet.' : 'No results.'}</p>
        </div>
      )}
      <div className="space-y-2">
        {filtered.map(b => (
          <div key={b.userId} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-xl px-3 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden"
              style={{ background: b.avatarUrl ? undefined : (b.avatarColor ?? getColor(b.username)) }}>
              {b.avatarUrl ? <img src={b.avatarUrl} alt="" className="w-full h-full object-cover" /> : (b.displayName ?? b.username)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#1A1B1E] font-semibold text-sm">{b.displayName ?? b.username}</div>
              <div className="text-[#96989D] text-xs">@{b.username}#{b.discriminator}</div>
              {b.reason && <div className="text-[#5C6068] text-xs mt-0.5 italic">"{b.reason}"</div>}
            </div>
            <button onClick={() => handleUnban(b.userId)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#E53935] hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200 shrink-0">
              <UserCheck size={12} /> Unban
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Emojis Tab ───────────────────────────────────────────────────────────────
function EmojisTab({ server, isOwner }) {
  const [emojis, setEmojis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getServerEmojis(server.id).then(setEmojis).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [server.id])

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return
    setSaving(true); setError('')
    try {
      const emoji = await api.createServerEmoji(server.id, newName.trim(), newUrl.trim())
      setEmojis(prev => [emoji, ...prev])
      setShowAdd(false); setNewName(''); setNewUrl('')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (emojiId) => {
    try {
      await api.deleteServerEmoji(server.id, emojiId)
      setEmojis(prev => prev.filter(e => e.id !== emojiId))
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#5C6068] text-xs">Custom emoji available to all members in this server.</p>
          <p className="text-[#96989D] text-[10px] mt-0.5">{emojis.length} / 50 slots used</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={13} /> Add Emoji
          </button>
        )}
      </div>

      {showAdd && isOwner && (
        <div className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1B1E] uppercase tracking-wider">Add Emoji</span>
            <button onClick={() => setShowAdd(false)}><X size={14} className="text-[#96989D]" /></button>
          </div>
          <SField label="Name (letters, numbers, underscores)" value={newName}
            onChange={setNewName} placeholder="e.g. cool_face" />
          <SField label="Image URL" value={newUrl}
            onChange={setNewUrl} placeholder="https://example.com/emoji.png"
            hint="Direct link to a PNG/GIF image (max 256×256px recommended)" />
          {newUrl && (
            <div className="flex items-center gap-2">
              <img src={newUrl} alt="preview" className="w-8 h-8 rounded object-contain bg-[#EAEBEE]"
                onError={e => e.target.style.display = 'none'} />
              <span className="text-xs text-[#96989D]">Preview</span>
            </div>
          )}
          <button onClick={handleAdd} disabled={saving || !newName.trim() || !newUrl.trim()}
            className="bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Adding…' : 'Add Emoji'}
          </button>
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" /></div>}
      {!loading && emojis.length === 0 && (
        <div className="text-center py-10">
          <Smile size={32} className="mx-auto text-[#96989D] mb-2 opacity-40" />
          <p className="text-[#96989D] text-sm">No custom emojis yet.</p>
          {isOwner && <p className="text-[#C0C2C7] text-xs mt-1">Click "Add Emoji" above to get started.</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {emojis.map(e => (
          <div key={e.id} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-xl px-3 py-2 flex items-center gap-3">
            <img src={e.imageUrl} alt={e.name} className="w-8 h-8 rounded object-contain bg-[#EAEBEE] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[#1A1B1E] font-mono text-xs font-semibold truncate">:{e.name}:</div>
              {e.creatorName && <div className="text-[#96989D] text-[10px]">by {e.creatorName}</div>}
            </div>
            {isOwner && (
              <button onClick={() => handleDelete(e.id)}
                className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#96989D] hover:text-[#E53935] transition-colors shrink-0">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Invites Tab ──────────────────────────────────────────────────────────────
function InvitesTab({ server }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getInvites(server.id).then(setInvites).catch(() => {}).finally(() => setLoading(false))
  }, [server.id])

  const generate = async () => {
    try {
      const inv = await api.createInvite(server.id)
      setInvites(prev => prev.find(i => i.code === inv.code) ? prev : [...prev, inv])
    } catch (err) { setError(err.message) }
  }

  const copy = (code) => {
    const url = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(code); setTimeout(() => setCopied(''), 2000)
    })
  }

  const revoke = async (code) => {
    try {
      await api.deleteInvite(server.id, code)
      setInvites(prev => prev.filter(i => i.code !== code))
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[#5C6068] text-xs">Share these links to invite people to your server.</p>
        <button onClick={generate}
          className="flex items-center gap-1.5 bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> New link
        </button>
      </div>
      {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" /></div>}
      {!loading && invites.length === 0 && (
        <div className="text-center py-8">
          <Link2 size={32} className="mx-auto text-[#96989D] mb-2 opacity-50" />
          <p className="text-[#96989D] text-sm">No invite links yet.</p>
          <button onClick={generate} className="mt-3 text-[#E53935] hover:text-[#C62828] text-sm font-semibold transition-colors">
            Generate one →
          </button>
        </div>
      )}
      <div className="space-y-2">
        {invites.map(inv => {
          const url = `${window.location.origin}/invite/${inv.code}`
          return (
            <div key={inv.code} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[#1A1B1E] font-mono font-bold text-sm">{inv.code}</div>
                <div className="text-[#96989D] text-xs truncate">{url}</div>
                <div className="text-[#96989D] text-xs mt-0.5">{inv.uses} use{inv.uses !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => copy(inv.code)}
                className="flex items-center gap-1 text-xs font-medium text-[#5C6068] hover:text-[#1A1B1E] bg-[#EAEBEE] hover:bg-[#E0E2E6] px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
                {copied === inv.code ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <button onClick={() => revoke(inv.code)}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#96989D] hover:text-[#E53935] transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerTab({ server, onDelete }) {
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirm !== server.name) return
    setDeleting(true)
    onDelete()
  }

  return (
    <div className="px-6 py-5">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-[#E53935] shrink-0" />
          <h3 className="font-bold text-[#E53935] text-sm">Delete Server</h3>
        </div>
        <p className="text-[#5C6068] text-sm mb-4 leading-relaxed">
          This permanently deletes <strong>{server.name}</strong> and all its channels and messages. This cannot be undone.
        </p>
        <label className="block text-xs font-bold text-[#1A1B1E] uppercase tracking-wider mb-1.5">
          Type <span className="font-mono text-[#E53935]">{server.name}</span> to confirm
        </label>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={server.name}
          className="w-full bg-white border border-red-200 text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300 placeholder:text-[#96989D] mb-4"
        />
        <button onClick={handleDelete} disabled={confirm !== server.name || deleting}
          className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          {deleting ? 'Deleting…' : 'Delete Server'}
        </button>
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SField({ label, value, onChange, placeholder, hint, disabled, required }) {
  return (
    <div>
      <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-[#E53935] ml-0.5">*</span>}
      </label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] transition-all disabled:opacity-60"
      />
      {hint && <p className="text-[#96989D] text-xs mt-1">{hint}</p>}
    </div>
  )
}

function ErrBanner({ msg, onDismiss }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
      <AlertTriangle size={14} className="shrink-0" />
      <span className="flex-1">{msg}</span>
      {onDismiss && <button onClick={onDismiss} className="text-red-400 hover:text-red-600"><X size={13} /></button>}
    </div>
  )
}
