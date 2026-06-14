import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Hash, Mic, Shield, Zap, Download, ChevronDown } from 'lucide-react'

// ── Platform detection ────────────────────────────────────────────────────────
function detectOS() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase()
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/mac/i.test(platform) || /macintosh/i.test(ua)) return 'macos'
  if (/win/i.test(platform) || /windows/i.test(ua)) return 'windows'
  if (/linux/i.test(platform) || /linux/i.test(ua)) return 'linux'
  return 'unknown'
}

// ── Platform icons ────────────────────────────────────────────────────────────
function WindowsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" />
    </svg>
  )
}

function AppleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function AndroidIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.341a1.5 1.5 0 1 1-2.998-.001 1.5 1.5 0 0 1 2.998.001zm-8.05 0a1.5 1.5 0 1 1-2.998-.001 1.5 1.5 0 0 1 2.998.001zm9.918-7.5c.013.122.02.247.02.374 0 3.868-3.078 7-6.875 7.125-.28.009-.558.004-.836-.007l-.21-.009c-3.759-.213-6.773-3.332-6.773-7.126 0-.118.005-.237.013-.354l-.009.063C4.51 7.902 4 7.196 4 6.374c0-1.106.896-2 2-2 .414 0 .797.127 1.113.343A8.058 8.058 0 0 1 12 3.125c1.757 0 3.383.563 4.707 1.517.288-.18.63-.285.998-.285.92 0 1.672.666 1.787 1.523l.008.127c0 .866-.535 1.6-1.299 1.867l.029-.059.161-.974zM7.773 8.5A.75.75 0 1 0 7.775 10 .75.75 0 0 0 7.773 8.5zm8.454 0a.75.75 0 1 0 .002 1.5.75.75 0 0 0-.002-1.5z" />
    </svg>
  )
}

function LinuxIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021C7.309.358 4.653 5.01 5.009 9.042c.301 3.273.924 5.765 2.242 8.085.37.663.678 1.264.756 1.988.081.739-.047 1.493-.151 2.176-.106.687-.202 1.284.149 1.604.264.243.667.306 1.034.307.378 0 .783-.065 1.04-.234.305-.2.42-.553.539-.857.12-.305.224-.602.398-.836.175-.235.426-.392.69-.531.262-.139.535-.261.806-.261.271 0 .544.122.806.261.264.139.515.296.69.531.174.234.278.531.398.836.119.304.234.657.539.857.257.169.662.234 1.04.234.367-.001.77-.064 1.034-.307.351-.32.255-.917.149-1.604-.104-.683-.232-1.437-.151-2.176.078-.724.386-1.325.756-1.988 1.318-2.32 1.941-4.812 2.242-8.085.356-4.032-2.3-8.684-7.015-9.021A7.34 7.34 0 0 0 12.504 0z" />
    </svg>
  )
}

const PLATFORM_CONFIG = {
  windows: { label: 'Windows', url: '/releases/windows/windows_x64.exe', download: true, icon: WindowsIcon },
  ios:     { label: 'iOS',     url: '/releases/ios/voxa.ipa',            download: true, icon: AppleIcon },
  macos:   { label: 'macOS',   url: '/releases/macos/voxa.dmg',          download: true, icon: AppleIcon },
  linux:   { label: 'Linux',   url: '/releases/linux/voxa.AppImage',     download: true, icon: LinuxIcon },
  android: { label: 'Android', url: '/releases/android/voxa.apk',        download: true, icon: AndroidIcon },
}

function useReleases() {
  const [releases, setReleases] = useState({})
  useEffect(() => {
    const platforms = ['windows', 'ios', 'macos', 'linux', 'android']
    platforms.forEach(p => {
      fetch(`/api/releases/${p}/latest`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setReleases(prev => ({ ...prev, [p]: d })) })
        .catch(() => {})
    })
  }, [])
  return releases
}

// ── Dropdown menu ─────────────────────────────────────────────────────────────
function PlatformDropdown({ platforms, releases, isLight }) {
  return (
    <div className={`absolute z-50 top-full mt-1.5 right-0 rounded-xl overflow-hidden min-w-[200px] ${
      isLight
        ? 'bg-white border border-[#E3E5E8] shadow-lg shadow-black/8'
        : 'bg-[#1A1B1E] border border-white/10 shadow-2xl shadow-black/30'
    }`}>
      <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-b ${
        isLight ? 'text-[#96989D] border-[#F2F3F5]' : 'text-white/30 border-white/5'
      }`}>
        Other platforms
      </div>
      {platforms.map(([key, cfg]) => {
        const Icon = cfg.icon
        const rel = releases[key]
        return (
          <a key={key} href={cfg.url} download={cfg.download}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
              isLight ? 'text-[#313439] hover:bg-[#F7F8FA]' : 'text-white/80 hover:bg-white/8'
            }`}>
            <Icon size={14} />
            <span className="flex-1">{cfg.label}</span>
            {rel?.version && (
              <span className={`text-[10px] tabular-nums ${isLight ? 'text-[#96989D]' : 'text-white/35'}`}>
                v{rel.version}
              </span>
            )}
          </a>
        )
      })}
    </div>
  )
}

// ── Download button (split button with platform dropdown) ─────────────────────
function DownloadButton({ os, releases, variant = 'light' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isLight = variant === 'light'

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const cfg = PLATFORM_CONFIG[os]
  const otherPlatforms = Object.entries(PLATFORM_CONFIG).filter(([key]) => key !== os)

  // No detected OS — show generic dropdown trigger
  if (!cfg) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className={`inline-flex items-center gap-2.5 font-semibold px-5 py-3 rounded-xl transition-all text-sm active:scale-[0.98] ${
            isLight
              ? 'bg-[#F2F3F5] hover:bg-[#E3E5E8] text-[#313439]'
              : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
          }`}
        >
          <Download size={15} />
          Download
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <PlatformDropdown
            platforms={Object.entries(PLATFORM_CONFIG)}
            releases={releases}
            isLight={isLight}
          />
        )}
      </div>
    )
  }

  const Icon = cfg.icon
  const release = releases[os]
  const divider = isLight ? 'border-[#D5D7DC]' : 'border-white/20'

  return (
    <div className="relative flex" ref={ref}>
      {/* Primary download */}
      <a
        href={cfg.url}
        download={cfg.download}
        className={`inline-flex items-center gap-2.5 font-semibold px-5 py-3 rounded-l-xl transition-all text-sm active:scale-[0.98] ${
          isLight
            ? 'bg-[#F2F3F5] hover:bg-[#E3E5E8] text-[#313439]'
            : 'bg-white/15 hover:bg-white/25 text-white border border-white/20 border-r-0'
        }`}
      >
        <Icon size={15} />
        Download for {cfg.label}
        {release?.version && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            isLight ? 'bg-[#E3E5E8] text-[#5C6068]' : 'bg-white/20 text-white/70'
          }`}>
            v{release.version}
          </span>
        )}
      </a>

      {/* Chevron to open dropdown */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`px-2.5 rounded-r-xl border-l transition-all ${
          isLight
            ? `bg-[#F2F3F5] hover:bg-[#E3E5E8] text-[#5C6068] ${divider}`
            : `bg-white/15 hover:bg-white/25 text-white/70 border border-l-0 ${divider}`
        }`}
        aria-label="Other platforms"
      >
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && otherPlatforms.length > 0 && (
        <PlatformDropdown platforms={otherPlatforms} releases={releases} isLight={isLight} />
      )}
    </div>
  )
}

export default function Home() {
  const os = detectOS()
  const releases = useReleases()
  return (
    <div className="bg-white text-[#1A1B1E] min-h-screen overflow-y-auto landing-scroll">
      <Nav />
      <Hero os={os} releases={releases} />
      <AppPreview />
      <Features />
      <CTA os={os} releases={releases} />
      <Footer releases={releases} />
    </div>
  )
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E3E5E8]/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#E53935] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm leading-none">v</span>
          </div>
          <span className="text-[#1A1B1E] font-bold text-sm tracking-tight">voxa</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-[#5C6068] hover:text-[#1A1B1E] text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F2F3F5]">
            Log in
          </Link>
          <Link to="/login?mode=register"
            className="bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md">
            Get started
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero({ os, releases }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-24 pb-12">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 bg-[#E53935]/8 text-[#E53935] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
          <Zap size={10} className="fill-[#E53935]" />
          Free · Open beta
        </div>
        <h1 className="text-[58px] leading-[1.06] font-black tracking-tight text-[#1A1B1E] mb-6">
          Talk somewhere<br />
          <span className="text-[#E53935]">you actually like.</span>
        </h1>
        <p className="text-[#5C6068] text-lg leading-relaxed mb-8 max-w-lg">
          Voxa is group chat done right. Servers, channels, voice, and video — all free. No paid tiers, no locked features, no Nitro.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/login?mode=register"
            className="inline-flex items-center gap-2 bg-[#E53935] hover:bg-[#C62828] text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm shadow-sm hover:shadow-md active:scale-[0.98]">
            Open Voxa free
            <ArrowRight size={15} />
          </Link>
          <DownloadButton os={os} releases={releases} variant="light" />
          <Link to="/login"
            className="text-[#5C6068] hover:text-[#1A1B1E] text-sm font-medium transition-colors px-4 py-3 rounded-xl hover:bg-[#F2F3F5]">
            Already have an account →
          </Link>
        </div>
      </div>
    </section>
  )
}

function AppPreview() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="rounded-2xl overflow-hidden border border-[#E3E5E8] shadow-2xl shadow-black/8">
        <div className="h-10 bg-[#F2F3F5] border-b border-[#E3E5E8] flex items-center px-4 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-[#E3E5E8] rounded-md px-10 py-0.5 text-[11px] text-[#96989D]">voxa.lol/app</div>
          </div>
        </div>
        <div className="flex h-[340px] bg-white">
          <div className="w-[200px] bg-[#F2F3F5] border-r border-[#E3E5E8] flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-[#E3E5E8]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#E53935] flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-[10px]">v</span>
                </div>
                <span className="text-xs font-bold text-[#1A1B1E]">voxa</span>
              </div>
            </div>
            <div className="flex-1 py-2 px-2 space-y-0.5 overflow-hidden">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#96989D] px-2 pt-1 pb-1">Your servers</div>
              {[
                { name: 'Voxa HQ', color: '#E53935', active: true },
                { name: 'Gaming Zone', color: '#6366F1', active: false },
                { name: 'Study Group', color: '#10B981', active: false },
              ].map(s => (
                <div key={s.name}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${s.active ? 'bg-[#E0E2E6]' : 'hover:bg-[#EAEBEE]'}`}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    style={{ background: s.color }}>
                    {s.name[0]}
                  </div>
                  <span className={`text-[11px] font-medium truncate ${s.active ? 'text-[#1A1B1E]' : 'text-[#5C6068]'}`}>
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#EAEBEE]">
                <div className="w-5 h-5 rounded-full bg-[#E53935] flex items-center justify-center text-white text-[9px] font-bold shrink-0">Y</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-[#1A1B1E] truncate leading-none">you</div>
                  <div className="text-[9px] text-[#10B981] font-medium">● online</div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-[160px] bg-[#F7F8FA] border-r border-[#E3E5E8] flex flex-col shrink-0">
            <div className="h-9 flex items-center px-3 border-b border-[#E3E5E8]">
              <span className="text-[#1A1B1E] text-[11px] font-bold truncate">Voxa HQ</span>
            </div>
            <div className="flex-1 py-2 px-2 space-y-0.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#96989D] px-1 pt-1 pb-0.5">Text Channels</div>
              {['general', 'off-topic', 'media'].map((ch, i) => (
                <div key={ch}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] cursor-pointer ${i === 0 ? 'bg-[#E0E2E6] text-[#1A1B1E]' : 'text-[#5C6068] hover:bg-[#EAEBEE]'}`}>
                  <span className="font-bold text-[#96989D] text-[10px]">#</span>
                  {ch}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            <div className="h-9 flex items-center px-4 border-b border-[#E3E5E8] gap-1.5">
              <span className="text-[#E53935] font-bold text-xs">#</span>
              <span className="text-[#1A1B1E] text-xs font-semibold">general</span>
            </div>
            <div className="flex-1 px-4 py-3 space-y-3 overflow-hidden">
              {[
                { u: 'Alex', c: 'hey everyone, welcome to voxa!', color: '#E53935' },
                { u: 'Sam', c: 'this looks so clean 🔥', color: '#6366F1' },
                { u: 'Jordan', c: 'way better than discord tbh', color: '#10B981' },
              ].map(m => (
                <div key={m.u} className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: m.color }}>
                    {m.u[0]}
                  </div>
                  <div>
                    <span className="text-[#1A1B1E] text-[11px] font-semibold mr-1.5">{m.u}</span>
                    <span className="text-[#96989D] text-[10px]">Today at 2:34 PM</span>
                    <p className="text-[#313439] text-[11px] mt-0.5">{m.c}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-4 mb-3 bg-[#F2F3F5] rounded-xl h-8 flex items-center px-3 gap-2 border border-[#E3E5E8]">
              <span className="text-[#96989D] text-xs">Message #general</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    {
      icon: Hash,
      title: 'Servers & channels',
      desc: 'Organize every conversation. Create servers for your communities, then divide them into focused channels and categories.',
    },
    {
      icon: Mic,
      title: 'Voice & video',
      desc: 'Jump into a voice channel with one click. Sub-50ms latency, screen sharing, and camera — no scheduling needed.',
    },
    {
      icon: Shield,
      title: 'Free, no catch',
      desc: "Everything works out of the box. Roles, permissions, moderation tools — no subscription required to access basic features.",
    },
  ]

  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="mb-10">
        <h2 className="text-[36px] font-black text-[#1A1B1E] tracking-tight leading-tight">
          Everything you need.
          <br />
          <span className="text-[#96989D] font-medium">Nothing you don't.</span>
        </h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.title} className="bg-[#F7F8FA] rounded-2xl p-6 border border-[#E3E5E8] hover:border-[#D0D2D6] hover:shadow-sm transition-all">
            <div className="w-9 h-9 bg-[#E53935]/10 rounded-xl flex items-center justify-center mb-4">
              <item.icon size={18} className="text-[#E53935]" />
            </div>
            <h3 className="font-bold text-[#1A1B1E] text-sm mb-2">{item.title}</h3>
            <p className="text-[#5C6068] text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CTA({ os, releases }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="bg-[#E53935] rounded-3xl px-10 py-14 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <h2 className="text-[32px] font-black tracking-tight mb-3 relative">Ready to ditch Discord?</h2>
        <p className="text-white/75 text-base mb-7 max-w-md mx-auto relative">
          Set up your server in 30 seconds. Your group will thank you.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap relative">
          <Link to="/login?mode=register"
            className="inline-flex items-center gap-2 bg-white text-[#E53935] font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/90 transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
            Create an account free
            <ArrowRight size={15} />
          </Link>
          <DownloadButton os={os} releases={releases} variant="dark" />
        </div>
      </div>
    </section>
  )
}

function Footer({ releases }) {
  const os = detectOS()
  const cfg = PLATFORM_CONFIG[os]
  const release = releases[os]
  const Icon = cfg?.icon

  return (
    <footer className="border-t border-[#E3E5E8] py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#E53935] rounded-md flex items-center justify-center">
                <span className="text-white font-black text-[10px] leading-none">v</span>
              </div>
              <span className="text-[#1A1B1E] font-bold text-sm">voxa</span>
            </div>
            <p className="text-[#96989D] text-xs">
              Questions? Email us at{' '}
              <a href="mailto:voxa@voxa.lol" className="text-[#E53935] hover:text-[#C62828] transition-colors font-medium">
                voxa@voxa.lol
              </a>
            </p>
            <p className="text-[#C0C2C7] text-xs">© 2025 Voxa. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            {['Terms', 'Privacy', 'Status'].map(l => (
              <a key={l} href="#" className="text-[#96989D] hover:text-[#1A1B1E] text-xs transition-colors">{l}</a>
            ))}
            {cfg ? (
              <a
                href={cfg.url}
                download={cfg.download}
                className="inline-flex items-center gap-1.5 text-[#96989D] hover:text-[#1A1B1E] text-xs transition-colors"
              >
                {Icon && <Icon size={11} />}
                Download{release?.version ? ` v${release.version}` : ''}
              </a>
            ) : (
              <a href="#" className="text-[#96989D] hover:text-[#1A1B1E] text-xs transition-colors">
                <Download size={11} className="inline mr-1" />Download
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
