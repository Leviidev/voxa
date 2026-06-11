import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

export default function Home() {
  return (
    <div className="bg-[#0f0f10] text-[#e2e2e4] min-h-screen overflow-y-auto landing-scroll">
      <Nav />
      <Hero />
      <Preview />
      <Why />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 bg-[#e03131] rounded-md flex items-center justify-center">
          <span className="text-white font-black text-base leading-none">v</span>
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">voxa</span>
      </Link>

      <div className="flex items-center gap-6">
        <a href="#" className="text-[#888] hover:text-white text-sm transition-colors hidden sm:block">Download</a>
        <Link to="/login" className="text-[#888] hover:text-white text-sm transition-colors">Log in</Link>
        <Link
          to="/login?mode=register"
          className="bg-[#e03131] hover:bg-[#c92a2a] text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
        >
          Sign up
        </Link>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
      <div className="max-w-2xl">
        <div className="text-[#e03131] text-sm font-medium mb-4 tracking-wide uppercase">
          Open beta
        </div>
        <h1 className="text-5xl font-bold text-white leading-tight tracking-tight mb-5">
          Chat, call, hang out.<br />
          No strings attached.
        </h1>
        <p className="text-[#888] text-lg leading-relaxed mb-8 max-w-lg">
          Voxa is a free alternative to Discord. Create a server for your friends, your community, or your team — voice, video, and text all in one place.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/login?mode=register"
            className="flex items-center gap-2 bg-[#e03131] hover:bg-[#c92a2a] text-white font-medium px-5 py-2.5 rounded-md transition-colors text-sm"
          >
            Get started free
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/login"
            className="text-[#888] hover:text-white text-sm transition-colors px-4 py-2.5"
          >
            Already have an account →
          </Link>
        </div>
      </div>
    </section>
  )
}

function Preview() {
  return (
    <section className="max-w-5xl mx-auto px-6 pb-20">
      <div className="rounded-xl overflow-hidden border border-white/[0.07] bg-[#1a1a1c]">
        {/* Fake titlebar */}
        <div className="h-9 bg-[#141415] border-b border-white/[0.06] flex items-center px-4 gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          <div className="flex-1 flex justify-center">
            <div className="bg-[#1e1e20] rounded px-8 py-0.5 text-[11px] text-[#555]">voxa.lol/voxa/servers/...</div>
          </div>
        </div>

        {/* App mockup */}
        <div className="flex h-80">
          {/* Server icons */}
          <div className="w-14 bg-[#111113] flex flex-col items-center py-3 gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#e03131] flex items-center justify-center">
              <span className="text-white font-black text-sm">v</span>
            </div>
            <div className="w-6 h-px bg-white/10" />
            {['G', 'M', 'A'].map((l, i) => (
              <div key={i} className="w-9 h-9 rounded-full bg-[#1e1e20] flex items-center justify-center text-[#888] text-xs font-bold hover:rounded-xl transition-all cursor-pointer">
                {l}
              </div>
            ))}
          </div>

          {/* Channels */}
          <div className="w-44 bg-[#181819] border-r border-white/[0.05] flex flex-col shrink-0">
            <div className="h-10 flex items-center px-3 border-b border-white/[0.05]">
              <span className="text-white text-xs font-semibold truncate">Voxa HQ</span>
            </div>
            <div className="flex-1 py-2 px-1 space-y-0.5">
              <div className="text-[10px] text-[#555] uppercase font-semibold px-2 pt-1 pb-0.5 tracking-wider">General</div>
              {['general', 'off-topic', 'media'].map((ch, i) => (
                <div key={ch} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer ${i === 0 ? 'bg-[#2a2a2d] text-white' : 'text-[#666] hover:text-[#999]'}`}>
                  <span className="text-[#555] font-bold">#</span>
                  {ch}
                </div>
              ))}
              <div className="text-[10px] text-[#555] uppercase font-semibold px-2 pt-2 pb-0.5 tracking-wider">Voice</div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#666] cursor-pointer hover:text-[#999]">
                <span className="text-[#555]">🔊</span>
                Lounge
              </div>
            </div>
            <div className="h-11 bg-[#111113] flex items-center px-2 gap-2 border-t border-white/[0.05]">
              <div className="w-6 h-6 rounded-full bg-[#e03131] flex items-center justify-center text-white text-[9px] font-bold">Y</div>
              <div>
                <div className="text-white text-[10px] font-semibold leading-none">you</div>
                <div className="text-[#555] text-[9px]">online</div>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 bg-[#1a1a1c] flex flex-col overflow-hidden">
            <div className="h-10 flex items-center px-4 gap-2 border-b border-white/[0.05]">
              <span className="text-[#555] font-bold text-sm">#</span>
              <span className="text-white text-xs font-semibold">general</span>
            </div>
            <div className="flex-1 px-4 py-3 space-y-3 overflow-hidden">
              {[
                { u: 'Alex', c: 'hey everyone, welcome to voxa!', t: 'Today at 11:02 AM', color: '#e03131' },
                { u: 'Sam', c: 'this looks really clean ngl', t: 'Today at 11:04 AM', color: '#3b82f6' },
                { u: 'Jordan', c: 'voice quality is actually great 👍', t: 'Today at 11:07 AM', color: '#8b5cf6' },
              ].map(m => (
                <div key={m.u} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: m.color }}>
                    {m.u[0]}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="text-white text-xs font-semibold">{m.u}</span>
                      <span className="text-[#444] text-[10px]">{m.t}</span>
                    </div>
                    <p className="text-[#bbb] text-xs">{m.c}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-4 mb-3 bg-[#222224] rounded-lg h-8 flex items-center px-3 gap-2">
              <span className="text-[#444] text-xs">Message #general</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const points = [
  'Servers with unlimited channels and members',
  'Voice and video calls built in',
  'Roles, permissions, and moderation tools',
  'Works in your browser — no download needed',
  'Cross-platform: Windows, Mac, Linux, iOS',
  'Free. No catch.',
]

function Why() {
  return (
    <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-2 gap-16 items-center">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
          Everything you'd expect, nothing you don't.
        </h2>
        <p className="text-[#666] text-sm leading-relaxed mb-8">
          We built Voxa because we wanted Discord without the bloat, the dark patterns, and the ever-expanding paywall. It's a chat app. It should just work.
        </p>
        <ul className="space-y-3">
          {points.map(p => (
            <li key={p} className="flex items-center gap-3 text-sm text-[#bbb]">
              <div className="w-4 h-4 rounded-full bg-[#e03131]/15 flex items-center justify-center shrink-0">
                <Check size={10} className="text-[#e03131]" strokeWidth={3} />
              </div>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {[
          {
            title: 'For gaming groups',
            desc: 'Set up voice channels, share clips in text chat, coordinate without switching apps.'
          },
          {
            title: 'For communities',
            desc: 'Organize with categories, control who sees what with roles, keep things tidy with moderation.'
          },
          {
            title: 'For small teams',
            desc: 'Persistent channels, searchable history, file sharing. No per-seat pricing.'
          },
        ].map(card => (
          <div key={card.title} className="bg-[#161617] border border-white/[0.06] rounded-lg p-4">
            <h3 className="text-white font-semibold text-sm mb-1">{card.title}</h3>
            <p className="text-[#666] text-sm leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#555] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#e03131] rounded flex items-center justify-center">
            <span className="text-white font-black text-xs leading-none">v</span>
          </div>
          <span>voxa.lol</span>
          <span>·</span>
          <span>© 2025 Voxa</span>
        </div>
        <div className="flex items-center gap-6">
          {['Terms', 'Privacy', 'Status', 'Download'].map(l => (
            <a key={l} href="#" className="hover:text-[#999] transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  )
}
