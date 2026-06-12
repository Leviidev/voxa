import { useState, useEffect } from 'react'
import { X, Settings, Shield, Users, Link2, Trash2, Plus, Check, Copy, AlertTriangle, Edit3, Crown, MoreVertical } from 'lucide-react'
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
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'members', label: 'Members', icon: Users },
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
function OverviewTab({ server, isOwner, onUpdated }) {
  const [form, setForm] = useState({
    name: server?.name ?? '',
    iconColor: server?.iconColor ?? '',
    iconUrl: server?.iconUrl ?? '',
    description: server?.description ?? '',
    bannerColor: server?.bannerColor ?? '',
    bannerUrl: server?.bannerUrl ?? '',
    isPublic: server?.isPublic ?? false,
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

// ─── Members Tab ──────────────────────────────────────────────────────────────
function MembersTab({ server, isOwner, currentUserId, onRefresh }) {
  const [members, setMembers] = useState(server?.members ?? [])
  const [roles] = useState(server?.roles ?? [])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    (m.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleKick = async (memberId) => {
    if (!window.confirm('Kick this member?')) return
    try {
      await api.kickMember(server.id, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err) { setError(err.message) }
  }

  const handleAssignRole = async (memberId, roleId) => {
    try {
      await api.assignRole(server.id, memberId, roleId)
      setMembers(prev => prev.map(m => {
        if (m.id !== memberId) return m
        const hasRole = m.roles?.find(r => r.id === roleId)
        return hasRole ? m : { ...m, roles: [...(m.roles ?? []), roles.find(r => r.id === roleId)] }
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

  return (
    <div className="px-6 py-5">
      {error && <ErrBanner msg={error} onDismiss={() => setError('')} />}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
          className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
        />
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-3">
        Members — {filtered.length}
      </div>
      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="bg-[#F7F8FA] border border-[#E3E5E8] rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden"
                style={{ background: m.avatarUrl ? undefined : (m.avatarColor ?? getColor(m.username)) }}>
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.displayName ?? m.username)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#1A1B1E] font-semibold text-sm truncate">{m.displayName ?? m.username}</span>
                  {m.isOwner && <Crown size={12} className="text-[#F59E0B] shrink-0" title="Server Owner" />}
                </div>
                <div className="text-[#96989D] text-xs">@{m.username}#{m.discriminator}</div>
              </div>
              {isOwner && !m.isOwner && m.id !== currentUserId && (
                <button onClick={() => handleKick(m.id)}
                  className="text-xs text-[#E53935] hover:bg-red-50 px-2 py-1 rounded-lg transition-colors font-medium">
                  Kick
                </button>
              )}
            </div>
            {/* Role badges + assignment */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              {(m.roles ?? []).filter(r => !r.isDefault).map(r => (
                <span key={r.id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: r.color ?? '#96989D' }}>
                  {r.name}
                  {isOwner && (
                    <button onClick={() => handleRemoveRole(m.id, r.id)} className="hover:opacity-70 transition-opacity ml-0.5">
                      <X size={9} />
                    </button>
                  )}
                </span>
              ))}
              {isOwner && roles.filter(r => !r.isDefault && !(m.roles ?? []).find(mr => mr.id === r.id)).map(r => (
                <button key={r.id} onClick={() => handleAssignRole(m.id, r.id)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-dashed border-[#E3E5E8] text-[#96989D] hover:border-[#5C6068] hover:text-[#5C6068] transition-colors">
                  <Plus size={9} /> {r.name}
                </button>
              ))}
            </div>
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
