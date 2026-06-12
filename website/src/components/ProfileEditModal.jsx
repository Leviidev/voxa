import { useState, useRef } from 'react'
import { X, Check, AlertCircle, User, Image, Smile, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import clsx from 'clsx'

function resizeToDataUrl(file, maxW, maxH, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new window.Image()
      img.onerror = reject
      img.onload = () => {
        let w = img.width, h = img.height
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const AVATAR_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#3949AB',
  '#1E88E5', '#00897B', '#43A047', '#F4511E',
  '#FB8C00', '#6D4C41',
]

const BANNER_COLORS = [
  '#1A1B1E', '#E53935', '#C62828', '#6A1B9A',
  '#1565C0', '#00695C', '#2E7D32', '#E65100',
  '#F57F17', '#4E342E',
]

const TABS = [
  { id: 'general', label: 'General', icon: User },
  { id: 'avatar', label: 'Avatar', icon: Smile },
  { id: 'banner', label: 'Banner', icon: Image },
]

export default function ProfileEditModal({ onClose }) {
  const { user, setUser } = useAuth()
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState({
    displayName: user?.displayName ?? '',
    bio: user?.bio ?? '',
    customStatus: user?.customStatus ?? '',
    avatarUrl: user?.avatarUrl ?? '',
    avatarColor: user?.avatarColor ?? '',
    bannerUrl: user?.bannerUrl ?? '',
    bannerColor: user?.bannerColor ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateProfile(form)
      const merged = { ...user, ...updated }
      localStorage.setItem('voxa_user', JSON.stringify(merged))
      if (setUser) setUser(merged)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const avatarColor = form.avatarColor || AVATAR_COLORS[user?.username?.charCodeAt(0) % AVATAR_COLORS.length] || '#E53935'
  const bannerColor = form.bannerColor || '#1A1B1E'
  const displayName = form.displayName || user?.username || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-[#E3E5E8] flex overflow-hidden max-h-[85vh]">

        {/* Left nav */}
        <div className="w-52 bg-[#F7F8FA] border-r border-[#E3E5E8] py-5 px-3 shrink-0">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] px-2 mb-2">Edit Profile</div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
                tab === t.id ? 'bg-[#E0E2E6] text-[#1A1B1E]' : 'text-[#5C6068] hover:bg-[#EAEBEE] hover:text-[#1A1B1E]')}>
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
              className="w-7 h-7 rounded-xl bg-[#F2F3F5] hover:bg-[#EAEBEE] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] transition-colors border border-[#E3E5E8]">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollable px-6 py-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                <AlertCircle size={14} className="shrink-0" />{error}
              </div>
            )}

            {tab === 'general' && (
              <GeneralTab form={form} handle={handle} user={user}
                avatarColor={avatarColor} bannerColor={bannerColor} displayName={displayName} />
            )}
            {tab === 'avatar' && (
              <AvatarTab form={form} handle={handle}
                avatarColor={avatarColor} displayName={displayName} user={user} />
            )}
            {tab === 'banner' && (
              <BannerTab form={form} handle={handle}
                avatarColor={avatarColor} bannerColor={bannerColor} displayName={displayName} />
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#E3E5E8] flex items-center justify-between shrink-0">
            <button onClick={onClose} className="text-sm font-medium text-[#5C6068] hover:text-[#1A1B1E] transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
              {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GeneralTab({ form, handle, user, avatarColor, bannerColor, displayName }) {
  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="rounded-2xl overflow-hidden border border-[#E3E5E8]">
        <div className="h-20 transition-colors" style={{ background: form.bannerUrl ? undefined : bannerColor }}>
          {form.bannerUrl && <img src={form.bannerUrl} alt="banner" className="w-full h-full object-cover" onError={() => {}} />}
        </div>
        <div className="px-5 pb-4 bg-white -mt-7 flex items-end gap-3">
          <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center font-black text-white text-2xl shrink-0 overflow-hidden"
            style={{ background: form.avatarUrl ? undefined : avatarColor }}>
            {form.avatarUrl
              ? <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : (displayName[0] ?? '?').toUpperCase()}
          </div>
          <div className="pb-1">
            <div className="font-bold text-[#1A1B1E] text-sm">{displayName}</div>
            <div className="text-[#96989D] text-xs">#{user?.discriminator}</div>
            {form.customStatus && <div className="text-[#5C6068] text-xs mt-0.5">{form.customStatus}</div>}
          </div>
        </div>
      </div>

      <Field label="Display Name" placeholder={user?.username} value={form.displayName} onChange={v => handle('displayName', v)} hint="This overrides your username in chat" />
      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">
          Bio <span className="text-[#96989D] font-normal normal-case tracking-normal">({(form.bio || '').length}/190)</span>
        </label>
        <textarea
          value={form.bio} onChange={e => handle('bio', e.target.value)} maxLength={190}
          placeholder="Tell people a bit about yourself…"
          rows={3}
          className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] resize-none transition-all"
        />
      </div>
      <Field label="Custom Status" placeholder="Coding away…" value={form.customStatus} onChange={v => handle('customStatus', v)} />
    </div>
  )
}

function AvatarTab({ form, handle, avatarColor, displayName, user }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setUploadError('File must be under 8 MB'); return }
    setUploading(true); setUploadError('')
    try {
      const dataUrl = await resizeToDataUrl(file, 400, 400)
      handle('avatarUrl', dataUrl)
    } catch { setUploadError('Failed to process image') }
    finally { setUploading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="flex justify-center py-4">
        <div className="w-24 h-24 rounded-full border-4 border-[#F2F3F5] flex items-center justify-center font-black text-white text-4xl overflow-hidden shadow-lg"
          style={{ background: form.avatarUrl ? undefined : avatarColor }}>
          {form.avatarUrl
            ? <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => {}} />
            : (displayName[0] ?? '?').toUpperCase()}
        </div>
      </div>

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-2">Upload Photo</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-[#F7F8FA] border border-[#E3E5E8] hover:bg-[#F2F3F5] disabled:opacity-50 text-[#5C6068] hover:text-[#1A1B1E] font-medium px-4 py-2.5 rounded-xl text-sm transition-colors w-full justify-center">
          <Upload size={14} />{uploading ? 'Uploading…' : 'Choose Image'}
        </button>
        {uploadError && <p className="text-[#E53935] text-xs mt-1">{uploadError}</p>}
        {form.avatarUrl && (
          <button onClick={() => handle('avatarUrl', '')}
            className="mt-1.5 text-xs text-[#96989D] hover:text-[#E53935] transition-colors w-full text-center">
            Remove image
          </button>
        )}
      </div>

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-2">Avatar Color</label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map(c => (
            <button key={c} onClick={() => handle('avatarColor', c)}
              className={clsx('w-9 h-9 rounded-xl transition-all', form.avatarColor === c ? 'ring-2 ring-[#1A1B1E] ring-offset-2 scale-110' : 'hover:scale-105')}
              style={{ background: c }} />
          ))}
          <button onClick={() => handle('avatarColor', '')}
            className="w-9 h-9 rounded-xl border-2 border-dashed border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:border-[#96989D] transition-colors text-xs font-bold">
            ✕
          </button>
        </div>
      </div>

      <Field label="Or paste image URL" placeholder="https://example.com/my-pic.png"
        value={form.avatarUrl?.startsWith('data:') ? '' : form.avatarUrl}
        onChange={v => handle('avatarUrl', v)}
        hint="PNG, JPG, or GIF — direct image link" />
    </div>
  )
}

function BannerTab({ form, handle, avatarColor, bannerColor, displayName }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setUploadError('File must be under 8 MB'); return }
    setUploading(true); setUploadError('')
    try {
      const dataUrl = await resizeToDataUrl(file, 1200, 400)
      handle('bannerUrl', dataUrl)
    } catch { setUploadError('Failed to process image') }
    finally { setUploading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-[#E3E5E8]">
        <div className="h-24 transition-colors" style={{ background: form.bannerUrl ? undefined : bannerColor }}>
          {form.bannerUrl && <img src={form.bannerUrl} alt="banner" className="w-full h-full object-cover" onError={() => {}} />}
        </div>
        <div className="px-4 py-2 bg-white flex items-center gap-2 -mt-5">
          <div className="w-10 h-10 rounded-full border-3 border-white flex items-center justify-center font-bold text-white text-sm shrink-0"
            style={{ background: avatarColor }}>
            {(displayName[0] ?? '?').toUpperCase()}
          </div>
          <div className="text-[#1A1B1E] font-bold text-sm">{displayName}</div>
        </div>
      </div>

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-2">Upload Banner</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-[#F7F8FA] border border-[#E3E5E8] hover:bg-[#F2F3F5] disabled:opacity-50 text-[#5C6068] hover:text-[#1A1B1E] font-medium px-4 py-2.5 rounded-xl text-sm transition-colors w-full justify-center">
          <Upload size={14} />{uploading ? 'Uploading…' : 'Choose Image'}
        </button>
        {uploadError && <p className="text-[#E53935] text-xs mt-1">{uploadError}</p>}
        {form.bannerUrl && (
          <button onClick={() => handle('bannerUrl', '')}
            className="mt-1.5 text-xs text-[#96989D] hover:text-[#E53935] transition-colors w-full text-center">
            Remove banner
          </button>
        )}
      </div>

      <div>
        <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-2">Banner Color</label>
        <div className="flex flex-wrap gap-2">
          {BANNER_COLORS.map(c => (
            <button key={c} onClick={() => handle('bannerColor', c)}
              className={clsx('w-9 h-9 rounded-xl transition-all', form.bannerColor === c ? 'ring-2 ring-[#1A1B1E] ring-offset-2 scale-110' : 'hover:scale-105')}
              style={{ background: c }} />
          ))}
          <button onClick={() => handle('bannerColor', '')}
            className="w-9 h-9 rounded-xl border-2 border-dashed border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:border-[#96989D] transition-colors text-xs font-bold">
            ✕
          </button>
        </div>
      </div>

      <Field label="Or paste banner URL" placeholder="https://example.com/banner.png"
        value={form.bannerUrl?.startsWith('data:') ? '' : form.bannerUrl}
        onChange={v => handle('bannerUrl', v)}
        hint="Recommended size 1500×500px — direct image link" />
    </div>
  )
}

function Field({ label, placeholder, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D] transition-all"
      />
      {hint && <p className="text-[#96989D] text-xs mt-1">{hint}</p>}
    </div>
  )
}
