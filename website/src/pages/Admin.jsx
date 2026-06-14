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

// ── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ onLock }) {
  const [stats, setStats] = useState(null)
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

  useEffect(() => { fetchReleases(); fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await adminFetch('/api/admin/stats')
      if (res.ok) setStats(await res.json())
    } catch { }
  }

  const fetchReleases = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/releases')
      if (res.status === 401) { onLock(); return }
      const data = await res.json()
      setReleases(Array.isArray(data) ? data : [])
    } catch { setReleases([]) }
    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.toLowerCase().endsWith('.exe')) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true); setUploadError(''); setUploadResult(null); setProgress(0)
    const formData = new FormData()
    formData.append('file', selectedFile)
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
          <div className="grid grid-cols-3 gap-3 mb-4">
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

        {/* Current release */}
        <div className="bg-white rounded-2xl border border-[#E3E5E8] p-5 mb-4 shadow-sm">
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
            <p className="text-sm text-[#96989D]">No release uploaded yet.</p>
          )}
        </div>

        {/* Upload */}
        <div className="bg-white rounded-2xl border border-[#E3E5E8] p-5 mb-4 shadow-sm">
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
            <input ref={fileRef} type="file" accept=".exe" className="hidden"
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
                <p className="text-sm font-medium">Drop .exe here or click to browse</p>
                <p className="text-xs mt-1">Windows installer only · max 600 MB</p>
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
            {uploading ? `Uploading… ${progress}%` : 'Upload Release'}
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
