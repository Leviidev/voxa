import { Link } from 'react-router-dom'
import { ArrowRight, Hash, Mic, Shield, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="bg-white text-[#1A1B1E] min-h-screen overflow-y-auto landing-scroll">
      <Nav />
      <Hero />
      <AppPreview />
      <Features />
      <CTA />
      <Footer />
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

function Hero() {
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
        {/* Fake titlebar */}
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

        {/* App mockup — light theme */}
        <div className="flex h-[340px] bg-white">
          {/* Server list */}
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

          {/* Channels */}
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

          {/* Chat */}
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

function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="bg-[#E53935] rounded-3xl px-10 py-14 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <h2 className="text-[32px] font-black tracking-tight mb-3 relative">Ready to ditch Discord?</h2>
        <p className="text-white/75 text-base mb-7 max-w-md mx-auto relative">
          Set up your server in 30 seconds. Your group will thank you.
        </p>
        <Link to="/login?mode=register"
          className="inline-flex items-center gap-2 bg-white text-[#E53935] font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/90 transition-all shadow-md hover:shadow-lg active:scale-[0.98] relative">
          Create an account free
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}

function Footer() {
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
            {['Terms', 'Privacy', 'Status', 'Download'].map(l => (
              <a key={l} href="#" className="text-[#96989D] hover:text-[#1A1B1E] text-xs transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
