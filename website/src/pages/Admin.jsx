import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle, Clock, HardDrive, Hash, ExternalLink, ChevronDown, ChevronUp, Lock, Users, MessageSquare, Server, Gamepad2, TrendingUp, Github, RefreshCw, Download, Package, GitBranch, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react'

function fmtBytes(n) {
  if (!n) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function fmtRelative(d) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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
    id: 'windows', label: 'Windows', ext: '.exe', accept: '.exe',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" /></svg>,
  },
  {
    id: 'ios', label: 'iOS', ext: '.ipa', accept: '.ipa',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>,
  },
  {
    id: 'macos', label: 'macOS', ext: '.dmg', accept: '.dmg,.pkg',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>,
  },
  {
    id: 'linux', label: 'Linux', ext: '.AppImage', accept: '.AppImage,.deb',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021C7.309.358 4.653 5.01 5.009 9.042c.301 3.273.924 5.765 2.242 8.085.37.663.678 1.264.756 1.988.081.739-.047 1.493-.151 2.176-.106.687-.202 1.284.149 1.604.264.243.667.306 1.034.307.378 0 .783-.065 1.04-.234.305-.2.42-.553.539-.857.12-.305.224-.602.398-.836.175-.235.426-.392.69-.531.262-.139.535-.261.806-.261.271 0 .544.122.806.261.264.139.515.296.69.531.174.234.278.531.398.836.119.304.234.657.539.857.257.169.662.234 1.04.234.367-.001.77-.064 1.034-.307.351-.32.255-.917.149-1.604-.104-.683-.232-1.437-.151-2.176.078-.724.386-1.325.756-1.988 1.318-2.32 1.941-4.812 2.242-8.085.356-4.032-2.3-8.684-7.015-9.021A7.34 7.34 0 0 0 12.504 0z" /></svg>,
  },
  {
    id: 'android', label: 'Android', ext: '.apk', accept: '.apk,.aab',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M17.523 15.341a1.5 1.5 0 1 1-2.998-.001 1.5 1.5 0 0 1 2.998.001zm-8.05 0a1.5 1.5 0 1 1-2.998-.001 1.5 1.5 0 0 1 2.998.001zm9.918-7.5c.013.122.02.247.02.374 0 3.868-3.078 7-6.875 7.125-.28.009-.558.004-.836-.007l-.21-.009c-3.759-.213-6.773-3.332-6.773-7.126 0-.118.005-.237.013-.354l-.009.063C4.51 7.902 4 7.196 4 6.374c0-1.106.896-2 2-2 .414 0 .797.127 1.113.343A8.058 8.058 0 0 1 12 3.125c1.757 0 3.383.563 4.707 1.517.288-.18.63-.285.998-.285.92 0 1.672.666 1.787 1.523l.008.127c0 .866-.535 1.6-1.299 1.867l.029-.059.161-.974z" /></svg>,
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
    setLoading(true); setError('')
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
    } catch { setError('Could not reach server') }
    finally { setLoading(false) }
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
            <input autoFocus type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Password"
              className="w-full bg-[#F7F8FA] border border-[#E3E5E8] focus:border-[#E53935] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors mb-3" />
            {error && (
              <div className="flex items-center gap-1.5 text-[#E53935] text-xs mb-3">
                <AlertCircle size={12} />{error}
              </div>
            )}
            <button type="submit" disabled={!password || loading}
              className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all text-sm">
              {loading ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Conclusion badge ──────────────────────────────────────────────────────────
function RunBadge({ status, conclusion }) {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
        <Loader size={10} className="animate-spin" />
        {status === 'queued' ? 'Queued' : 'Running'}
      </span>
    )
  }
  if (conclusion === 'success') return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle size={10} />Success
    </span>
  )
  if (conclusion === 'failure') return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#E53935]">
      <XCircle size={10} />Failed
    </span>
  )
  if (conclusion === 'cancelled') return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F3F5] text-[#96989D]">
      <XCircle size={10} />Cancelled
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F3F5] text-[#96989D]">
      {conclusion || status}
    </span>
  )
}

// ── Import modal ──────────────────────────────────────────────────────────────
function ImportModal({ artifact, runName, onClose, onImported }) {
  const [platform, setPlatform] = useState('ios')
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const doImport = async () => {
    setImporting(true); setError('')
    try {
      const res = await adminFetch('/api/admin/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId: artifact.id, platform, version, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      onImported(data)
    } catch (err) { setError(err.message) }
    finally { setImporting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#E3E5E8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3E5E8] flex items-center justify-between">
          <div>
            <h2 className="font-black text-[#1A1B1E] text-sm">Import Artifact</h2>
            <p className="text-[10px] text-[#96989D] mt-0.5 truncate max-w-xs">{artifact.name} · {fmtBytes(artifact.sizeInBytes)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl bg-[#F2F3F5] hover:bg-[#E3E5E8] flex items-center justify-center text-[#96989D] transition-colors text-xs font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-2 block">Publish as Platform</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all border ${
                    platform === p.id
                      ? 'border-[#E53935] bg-red-50 text-[#E53935]'
                      : 'border-[#E3E5E8] text-[#96989D] hover:border-[#E53935]/40 hover:text-[#5C6068]'
                  }`}>
                  <span className={platform === p.id ? 'text-[#E53935]' : 'text-[#96989D]'}>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1 block">Version (optional)</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 0.2.0"
                className="w-full bg-[#F7F8FA] border border-[#E3E5E8] focus:border-[#E53935] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1 block">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What changed?"
                className="w-full bg-[#F7F8FA] border border-[#E3E5E8] focus:border-[#E53935] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none placeholder:text-[#96989D] transition-colors" />
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={14} className="text-[#E53935] shrink-0 mt-0.5" />
              <p className="text-xs text-[#E53935]">{error}</p>
            </div>
          )}
          <button onClick={doImport} disabled={importing}
            className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
            {importing ? <><Loader size={14} className="animate-spin" />Importing…</> : <><Download size={14} />Import & Publish</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GitHub Actions Panel ──────────────────────────────────────────────────────
function GitHubPanel({ onLock }) {
  const [config, setConfig] = useState(null)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedRun, setExpandedRun] = useState(null)
  const [artifacts, setArtifacts] = useState({})
  const [loadingArtifacts, setLoadingArtifacts] = useState({})
  const [importTarget, setImportTarget] = useState(null)
  const [importSuccess, setImportSuccess] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = async (p = page) => {
    setLoading(true); setError('')
    try {
      const [cfgRes, runsRes] = await Promise.all([
        adminFetch('/api/admin/github/config'),
        adminFetch(`/api/admin/github/runs?page=${p}`),
      ])
      if (cfgRes.status === 401 || runsRes.status === 401) { onLock(); return }
      const cfgData = await cfgRes.json()
      setConfig(cfgData)
      if (runsRes.ok) {
        const runsData = await runsRes.json()
        setRuns(Array.isArray(runsData) ? runsData : (runsData.runs || []))
        setTotalPages(runsData.totalPages || 1)
        setPage(runsData.page || p)
      } else {
        const errData = await runsRes.json()
        setError(errData.error || 'Failed to load runs')
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const goToPage = (p) => {
    setExpandedRun(null)
    setPage(p)
    load(p)
  }

  useEffect(() => { load(1) }, [])

  const toggleRun = async (runId) => {
    if (expandedRun === runId) { setExpandedRun(null); return }
    setExpandedRun(runId)
    if (artifacts[runId]) return
    setLoadingArtifacts(p => ({ ...p, [runId]: true }))
    try {
      const res = await adminFetch(`/api/admin/github/runs/${runId}/artifacts`)
      if (res.ok) {
        const data = await res.json()
        setArtifacts(p => ({ ...p, [runId]: data }))
      } else {
        setArtifacts(p => ({ ...p, [runId]: [] }))
      }
    } catch { setArtifacts(p => ({ ...p, [runId]: [] })) }
    finally { setLoadingArtifacts(p => ({ ...p, [runId]: false })) }
  }

  if (!config?.configured) {
    return (
      <div className="bg-white rounded-2xl border border-[#E3E5E8] p-8 shadow-sm text-center">
        <div className="w-12 h-12 bg-[#F2F3F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Github size={22} className="text-[#5C6068]" />
        </div>
        <h3 className="font-black text-[#1A1B1E] text-sm mb-1">GitHub not configured</h3>
        <p className="text-xs text-[#96989D] mb-4 max-w-xs mx-auto">
          Set <code className="bg-[#F2F3F5] px-1 rounded">GITHUB_REPO</code> (e.g. <code className="bg-[#F2F3F5] px-1 rounded">username/voxa</code>) and <code className="bg-[#F2F3F5] px-1 rounded">GITHUB_TOKEN</code> as environment secrets to enable GitHub Actions import.
        </p>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E53935] hover:underline">
          <RefreshCw size={11} />Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {importTarget && (
        <ImportModal
          artifact={importTarget.artifact}
          runName={importTarget.runName}
          onClose={() => setImportTarget(null)}
          onImported={(result) => {
            setImportTarget(null)
            setImportSuccess(result)
            setTimeout(() => setImportSuccess(null), 5000)
          }}
        />
      )}

      <div className="bg-white rounded-2xl border border-[#E3E5E8] p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Github size={16} className="text-[#1A1B1E]" />
          <div>
            <p className="text-sm font-bold text-[#1A1B1E]">{config.repo}</p>
            <p className="text-[10px] text-[#96989D]">
              {config.hasToken ? '✓ Authenticated' : '⚠ No token — public repos only'}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#96989D] hover:text-[#5C6068] transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {importSuccess && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl p-4">
          <CheckCircle2 size={16} className="text-[#23a55a] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#23a55a]">Import successful!</p>
            <p className="text-xs text-[#5C6068] mt-0.5">Published to <code className="bg-white/60 px-1 rounded">{importSuccess.url}</code> · {fmtBytes(importSuccess.sizeBytes)}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertTriangle size={16} className="text-[#E53935] shrink-0 mt-0.5" />
          <p className="text-sm text-[#E53935]">{error}</p>
        </div>
      )}

      {loading && !runs.length ? (
        <div className="bg-white rounded-2xl border border-[#E3E5E8] p-8 flex items-center justify-center shadow-sm">
          <div className="w-5 h-5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E3E5E8] p-8 text-center shadow-sm">
          <p className="text-sm text-[#96989D]">No workflow runs found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E3E5E8] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E3E5E8] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#96989D]">Workflow Runs</h2>
            <span className="text-[10px] text-[#96989D]">Page {page} of {totalPages}</span>
          </div>
          <div className="divide-y divide-[#E3E5E8]">
            {runs.map(run => (
              <div key={run.id}>
                <button onClick={() => toggleRun(run.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F7F8FA] transition-colors text-left">
                  <RunBadge status={run.status} conclusion={run.conclusion} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A1B1E] truncate">{run.displayTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#96989D]">{run.workflowName}</span>
                      <span className="text-[#E3E5E8]">·</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[#96989D]">
                        <GitBranch size={9} />{run.branch}
                      </span>
                      <span className="text-[#E3E5E8]">·</span>
                      <span className="text-[10px] text-[#96989D] font-mono">{run.sha}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-[#96989D]">{fmtRelative(run.createdAt)}</span>
                    <a href={run.htmlUrl} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[#96989D] hover:text-[#5C6068] transition-colors">
                      <ExternalLink size={11} />
                    </a>
                    {expandedRun === run.id
                      ? <ChevronUp size={13} className="text-[#96989D]" />
                      : <ChevronDown size={13} className="text-[#96989D]" />}
                  </div>
                </button>

                {expandedRun === run.id && (
                  <div className="px-5 pb-4 bg-[#F7F8FA] border-t border-[#E3E5E8]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mt-3 mb-2">Artifacts</p>
                    {loadingArtifacts[run.id] ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-3.5 h-3.5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-[#96989D]">Loading artifacts…</span>
                      </div>
                    ) : !artifacts[run.id]?.length ? (
                      <p className="text-xs text-[#96989D] py-2">No artifacts available for this run.</p>
                    ) : (
                      <div className="space-y-2">
                        {artifacts[run.id].map(artifact => (
                          <div key={artifact.id}
                            className="flex items-center justify-between bg-white rounded-xl border border-[#E3E5E8] px-4 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Package size={13} className="text-[#96989D] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#1A1B1E] truncate">{artifact.name}</p>
                                <p className="text-[10px] text-[#96989D]">
                                  {fmtBytes(artifact.sizeInBytes)} · expires {fmtRelative(artifact.expiresAt)}
                                </p>
                              </div>
                            </div>
                            {artifact.expired ? (
                              <span className="text-[10px] text-[#96989D] font-medium px-2 py-1 bg-[#F2F3F5] rounded-lg">Expired</span>
                            ) : (
                              <button
                                onClick={() => setImportTarget({ artifact, runName: run.workflowName })}
                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#E53935] hover:bg-[#C62828] px-3 py-1.5 rounded-xl transition-all shrink-0">
                                <Download size={11} />Import
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#E3E5E8] flex items-center justify-between">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#5C6068] hover:text-[#1A1B1E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    disabled={loading}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      p === page
                        ? 'bg-[#E53935] text-white'
                        : 'text-[#96989D] hover:bg-[#F2F3F5] hover:text-[#1A1B1E]'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#5C6068] hover:text-[#1A1B1E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>
            </div>
          )}
        </div>
      )}
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
    setReleases([]); setLoading(true); setSelectedFile(null)
    setVersion(''); setNotes(''); setUploadResult(null); setUploadError('')
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

      <div className="bg-white rounded-2xl border border-[#E3E5E8] p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#96989D] mb-4">Upload New Release</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
            dragOver ? 'border-[#E53935] bg-red-50' : selectedFile ? 'border-[#23a55a] bg-green-50' : 'border-[#E3E5E8] hover:border-[#E53935]/50'
          }`}>
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
const TABS = [
  { id: 'github', label: 'GitHub Actions', icon: Github },
  ...PLATFORMS.map(p => ({ id: p.id, label: p.label, icon: null, platform: p })),
]

function Dashboard({ onLock }) {
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('github')

  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  const activePlatform = PLATFORMS.find(p => p.id === activeTab) ?? null

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

        <div className="bg-white rounded-2xl border border-[#E3E5E8] shadow-sm mb-4 overflow-hidden">
          <div className="flex border-b border-[#E3E5E8] overflow-x-auto">
            {/* GitHub Actions tab */}
            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === 'github'
                  ? 'border-[#E53935] text-[#E53935]'
                  : 'border-transparent text-[#96989D] hover:text-[#5C6068] hover:bg-[#F7F8FA]'
              }`}>
              <Github size={13} className={activeTab === 'github' ? 'text-[#E53935]' : 'text-[#96989D]'} />
              GitHub Actions
            </button>

            {/* Platform tabs */}
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setActiveTab(p.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === p.id
                    ? 'border-[#E53935] text-[#E53935]'
                    : 'border-transparent text-[#96989D] hover:text-[#5C6068] hover:bg-[#F7F8FA]'
                }`}>
                <span className={activeTab === p.id ? 'text-[#E53935]' : 'text-[#96989D]'}>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'github'
              ? <GitHubPanel onLock={onLock} />
              : activePlatform && <PlatformPanel key={activePlatform.id} platform={activePlatform} onLock={onLock} />
            }
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
