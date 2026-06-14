import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle, Clock, HardDrive, Hash, ExternalLink, ChevronDown, ChevronUp, Lock, Users, MessageSquare, Server, Gamepad2, TrendingUp } from 'lucide-react'

function fmtBytes(n) {
  if (!n) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const TOKEN_KEY = 'voxa_admin_token'

function adminFetch(path, opts = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY)
  return fetch(path, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
  })
}

const PLATFORMS = [
  {
    id: 'windows',
    label: 'Windows',
    ext: '.exe',
    accept: '.exe',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" />
      </svg>
    ),
  },
  {
    id: 'ios',
    label: 'iOS',
    ext: '.ipa',
    accept: '.ipa',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    id: 'macos',
    label: 'macOS',
    ext: '.dmg',
    accept: '.dmg,.pkg',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    id: 'linux',
    label: 'Linux',
    ext: '.AppImage',
    accept: '.AppImage,.deb',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021C7.309.358 4.653 5.01 5.009 9.042c.301 3.273.924 5.765 2.242 8.085.37.663.678 1.264.756 1.988.081.739-.047 1.493-.151 2.176-.106.687-.202 1.284.149 1.604.264.243.667.306 1.034.307.378 0 .783-.065 1.04-.234.305-.2.42-.553.539-.857.12-.305.224-.602.398-.836.175-.235.426-.392.69-.531.262-.139.535-.261.806-.261.271 0 .544.122.806.261.264.139.515.296.69.531.174.234.278.531.398.836.119.304.234.657.539.857.257.169.662.234 1.04.234.367-.001.77-.064 1.034-.307.351-.32.255-.917.149-1.604-.104-.683-.232-1.437-.151-2.176.078-.724.386-1.325.756-1.988 1.318-2.32 1.941-4.812 2.242-8.085.356-4.032-2.3-8.684-7.015-9.021A7.34 7.34 0 0 0 12.504 0zm.135 1.601c4.184.247 6.416 4.243 6.105 7.712-.294 3.189-.91 5.494-2.125 7.637-.364.652-.783 1.432-.905 2.451-.107.908.023 1.716.129 2.404.093.605.177 1.17.021 1.318-.064.059-.218.102-.459.103-.25 0-.47-.048-.573-.115-.128-.083-.227-.297-.357-.638-.127-.338-.291-.754-.595-1.163-.303-.408-.718-.698-1.15-.926-.432-.228-.897-.371-1.334-.371-.437 0-.902.143-1.334.371-.432.228-.847.518-1.15.926-.304.409-.468.825-.595 1.163-.13.341-.229.555-.357.638-.103.067-.323.115-.573.115-.241-.001-.395-.044-.459-.103-.156-.148-.072-.713.021-1.318.106-.688.236-1.496.129-2.404-.122-1.019-.541-1.799-.905-2.451-1.215-2.143-1.831-4.448-2.125-7.637-.311-3.469 1.921-7.465 6.105-7.712.058-.003.117-.005.176-.005z" />
      </svg>
    ),
  },
  {
    id: 'android',
    label: 'Android',
    ext: '.apk',
    accept: '.apk,.aab',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M17.523 15.341a1.5 1.5 0 1 1-2.998-.001 1.5 1.5 0 0 1 2.998.001zm-8.05 0a1.5 1.5 0 1 1-2.998-.001 1.5 1.5 0 0 1 2.998.001zm9.918-7.5c.013.122.02.247.02.374 0 3.868-3.078 7-6.875 7.125-.28.009-.558.004-.836-.007l-.21-.009c-3.759-.213-6.773-3.332-6.773-7.126 0-.118.005-.237.013-.354l-.009.063C4.51 7.902 4 7.196 4 6.374c0-1.106.896-2 2-2 .414 0 .797.127 1.113.343A8.058 8.058 0 0 1 12 3.125c1.757 0 3.383.563 4.707 1.517.288-.18.63-.285.998-.285.92 0 1.672.666 1.787 1.523l.008.127c0 .866-.535 1.6-1.299 1.867l.029-.059.161-.974zM7.773 8.5A.75.75 0 1 0 7.775 10 .75.75 0 0 0 7.773 8.5zm8.454 0a.75.75 0 1 0 .002 1.5.75.75 0 0 0-.002-1.5z" />
      </svg>
    ),
  },
]

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Incorrect password'); return }
      sessionStorage.setItem(TOKEN_KEY, data.token)
      onUnlock()
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#F7F8FA]">
      <div className="w-full max-w-[360px] mx-4">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-[#E53935] rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xl leading-none">v</span>
          </div>
          <span className="text-[#1A1B1E] font-black text-xl tracking-tight">voxa</span>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E3E5E8]">
          <div className="w-12 h-12 rounded-full bg-[#F2F3F5] flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-[#5C6068]" />
          </div>
          <h1 className="text-lg font-black text-[#1A1B1E] text-center tracking-tight mb-1">Admin Access</h1>
          <p className="text-[#96989D] text-xs text-center mb-6">Enter the admin password to continue</p>
          <form onSubmit={submit} noValidate>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Password"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] focus:border-[#E53935] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors mb-3"
            />
            {error && (
              <div className="flex items-center gap-1.5 text-[#E53935] text-xs mb-3">
                <AlertCircle size={12} />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!password || loading}
              className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Platform Upload Panel ─────────────────────────────────────────────────────
function PlatformPanel({ platform, onLock }) {
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    setReleases([])
    setLoading(true)
    setSelectedFile(null)
    setVersion('')
    setNotes('')
    setUploadResult(null)
    setUploadError('')
    fetchReleases()
  }, [platform.id])

  const fetchReleases = async () => {
    try {
      const res = await adminFetch(`/api/admin/releases?platform=${platform.id}`)
      if (res.status === 401) { onLock(); return }
      const data = await res.json()
      setReleases(Array.isArray(data) ? data : [])
    } catch { setReleases([]) }
    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true); setUploadError(''); setUploadResult(null); setProgress(0)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('platform', platform.id)
    if (version.trim()) formData.append('version', version.trim())
    if (notes.trim()) formData.append('notes', notes.trim())
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/releases/upload')
        xhr.setRequestHeader('Authorization', `Bearer ${sessionStorage.getItem(TOKEN_KEY)}`)
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadResult(JSON.parse(xhr.responseText))
            setSelectedFile(null); setVersion(''); setNotes('')
            fetchReleases(); resolve()
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error)) }
            catch { reject(new Error('Upload failed')) }
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })
    } catch (err) { setUploadError(err.message) }
    finally { setUploading(false); setProgress(0) }
  }

  const latest = releases[0] ?? null

  return (
    <div className="space-y-4">
      {/* Current release */}
      <div className="bg-white rounded-2xl border border-[#E3E5E8] p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#96989D] mb-4">Current Live Release</h2>
        {loading ? (
          <div className="h-12 flex items-center">
            <div className="w-5 h-5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : latest ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F7F8FA] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[#96989D] mb-1">
                  <Hash size={11} /><span className="text-[10px] font-bold uppercase tracking-wider">SHA-256</span>
                </div>
                <p className="text-xs font-mono text-[#313439] break-all leading-relaxed">{latest.sha256}</p>
              </div>
              <div className="space-y-2">
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[#96989D] mb-1">
                    <Clock size={11} /><span className="text-[10px] font-bold uppercase tracking-wider">Uploaded</span>
                  </div>
                  <p className="text-xs text-[#313439]">{fmtDate(latest.uploadedAt)}</p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[#96989D] mb-1">
                    <HardDrive size={11} /><span className="text-[10px] font-bold uppercase tracking-wider">Size</span>
                  </div>
                  <p className="text-xs text-[#313439]">{fmtBytes(latest.sizeBytes)}{latest.version ? ` · v${latest.version}` : ''}</p>
                </div>
              </div>
            </div>
            <a href={latest.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#E53935] font-semibold hover:underline">
              <ExternalLink size={11} />{latest.url}
            </a>
          </div>
        ) : (
          <p className="text-sm text-[#96989D]">No {platform.label} release uploaded yet.</p>
        )}
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-[#E3E5E8] p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#96989D] mb-4">Upload New Release</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
            dragOver ? 'border-[#E53935] bg-red-50' : selectedFile ? 'border-[#23a55a] bg-green-50' : 'border-[#E3E5E8] hover:border-[#E53935]/50'
          }`}
        >
          <input ref={fileRef} type="file" accept={platform.accept} className="hidden"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)} />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-[#23a55a]">
              <CheckCircle2 size={18} />
              <div className="text-left">
                <p className="text-sm font-semibold">{selectedFile.name}</p>
                <p className="text-xs text-[#96989D]">{fmtBytes(selectedFile.size)}</p>
              </div>
            </div>
          ) : (
            <div className="text-[#96989D]">
              <Upload size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Drop {platform.ext} here or click to browse</p>
              <p className="text-xs mt-1">{platform.label} installer · max 600 MB</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1 block">Version (optional)</label>
            <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 0.2.0"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] focus:border-[#E53935] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1 block">Release Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What changed?"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] focus:border-[#E53935] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors" />
          </div>
        </div>

        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#5C6068] mb-1"><span>Uploading…</span><span>{progress}%</span></div>
            <div className="h-2 bg-[#F7F8FA] rounded-full overflow-hidden">
              <div className="h-full bg-[#E53935] rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {uploadResult && (
          <div className="mb-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
            <CheckCircle2 size={16} className="text-[#23a55a] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#23a55a]">Upload successful!</p>
              <p className="text-xs text-[#5C6068] font-mono mt-0.5 break-all">{uploadResult.sha256}</p>
            </div>
          </div>
        )}
        {uploadError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={16} className="text-[#E53935] shrink-0" />
            <p className="text-sm text-[#E53935]">{uploadError}</p>
          </div>
        )}
        <button onClick={handleUpload} disabled={!selectedFile || uploading}
          className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm">
          {uploading ? `Uploading… ${progress}%` : `Upload ${platform.label} Release`}
        </button>
      </div>

      {/* History */}
      {releases.length > 1 && (
        <div className="bg-white rounded-2xl border border-[#E3E5E8] shadow-sm overflow-hidden">
          <button onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F8FA] transition-colors">
            <span className="text-xs font-bold uppercase tracking-widest text-[#96989D]">Release History ({releases.length})</span>
            {showHistory ? <ChevronUp size={14} className="text-[#96989D]" /> : <ChevronDown size={14} className="text-[#96989D]" />}
          </button>
          {showHistory && (
            <div className="border-t border-[#E3E5E8] divide-y divide-[#E3E5E8]">
              {releases.slice(1).map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {r.version && <span className="text-xs font-bold text-[#1A1B1E]">v{r.version}</span>}
                      <span className="text-[10px] text-[#96989D]">{fmtDate(r.uploadedAt)}</span>
                    </div>
                    <p className="text-[10px] font-mono text-[#96989D] truncate">{r.sha256}</p>
                  </div>
                  <span className="text-[10px] text-[#96989D] shrink-0">{fmtBytes(r.sizeBytes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ onLock }) {
  const [stats, setStats] = useState(null)
  const [activePlatform, setActivePlatform] = useState(PLATFORMS[0])

  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E53935] rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-xl leading-none">v</span>
            </div>
            <div>
              <h1 className="font-black text-[#1A1B1E] text-lg leading-none">Voxa Admin</h1>
              <p className="text-[#96989D] text-xs mt-0.5">Release Management</p>
            </div>
          </div>
          <button onClick={onLock}
            className="flex items-center gap-1.5 text-xs font-medium text-[#96989D] hover:text-[#5C6068] transition-colors">
            <Lock size={11} /> Lock
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Users', value: stats.totalUsers?.toLocaleString(), sub: `+${stats.newUsers24h} today`, icon: Users },
              { label: 'Messages', value: stats.totalMessages?.toLocaleString(), sub: `+${stats.messages24h} today`, icon: MessageSquare },
              { label: 'Servers', value: stats.totalServers?.toLocaleString(), sub: null, icon: Server },
              { label: 'Playing Now', value: stats.activeGames?.toLocaleString(), sub: 'active game status', icon: Gamepad2 },
            ].map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E3E5E8] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#96989D]">{label}</span>
                  <Icon size={12} className="text-[#96989D]" />
                </div>
                <p className="text-2xl font-black text-[#1A1B1E] leading-none">{value ?? '—'}</p>
                {sub && <p className="text-[10px] text-[#96989D] mt-1 flex items-center gap-1"><TrendingUp size={9} />{sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Platform tabs */}
        <div className="bg-white rounded-2xl border border-[#E3E5E8] shadow-sm mb-4 overflow-hidden">
          <div className="flex border-b border-[#E3E5E8] overflow-x-auto">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activePlatform.id === p.id
                    ? 'border-[#E53935] text-[#E53935]'
                    : 'border-transparent text-[#96989D] hover:text-[#5C6068] hover:bg-[#F7F8FA]'
                }`}
              >
                <span className={activePlatform.id === p.id ? 'text-[#E53935]' : 'text-[#96989D]'}>
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-5">
            <PlatformPanel key={activePlatform.id} platform={activePlatform} onLock={onLock} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) return
    fetch('/api/admin/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) setUnlocked(true) })
      .catch(() => {})
  }, [])

  const lock = () => { sessionStorage.removeItem(TOKEN_KEY); setUnlocked(false) }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />
  return <Dashboard onLock={lock} />
}
