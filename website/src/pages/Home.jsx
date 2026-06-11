import { Link } from 'react-router-dom'
import { MessageSquare, Mic, Video, Users, Shield, Zap, ChevronRight, Star, Globe, Headphones } from 'lucide-react'

export default function Home() {
  return (
    <div className="bg-voxa-bg text-voxa-text min-h-screen overflow-y-auto landing-scroll">
      <Nav />
      <Hero />
      <Features />
      <Stats />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-voxa-bg/90 backdrop-blur border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 bg-voxa-red rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-lg leading-none">v</span>
          </div>
          <span className="text-voxa-header font-bold text-xl tracking-tight">voxa</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-voxa-text-muted">
          <a href="#features" className="hover:text-voxa-header transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-voxa-header transition-colors">How It Works</a>
          <a href="#" className="hover:text-voxa-header transition-colors">Download</a>
          <a href="#" className="hover:text-voxa-header transition-colors">Nitro</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-voxa-header hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10">
            Log In
          </Link>
          <Link to="/login?mode=register" className="text-sm font-semibold bg-voxa-red hover:bg-voxa-red-light text-white px-5 py-2 rounded-full transition-all hover:shadow-lg hover:shadow-voxa-red/30">
            Sign Up — It's Free
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden py-28 px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-voxa-red/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-voxa-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-5xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 bg-voxa-red/15 border border-voxa-red/30 text-voxa-red-light text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <Star size={12} fill="currentColor" />
          The future of communication is here
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-voxa-header leading-none tracking-tighter mb-6">
          Imagine<br />
          <span className="text-voxa-red">a Place</span>
        </h1>
        <p className="text-lg md:text-xl text-voxa-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          …where you can belong to a school club, a gaming group, or a worldwide art community. Where just you and a handful of friends can spend time together. A place that makes it easy to talk every day and hang out more often.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login?mode=register"
            className="group flex items-center gap-2 bg-voxa-red hover:bg-voxa-red-light text-white font-bold text-lg px-8 py-4 rounded-full transition-all hover:shadow-2xl hover:shadow-voxa-red/40 hover:-translate-y-0.5 pulse-glow"
          >
            Open Voxa in your browser
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#" className="flex items-center gap-2 border border-white/20 hover:border-white/40 text-voxa-header font-semibold text-lg px-8 py-4 rounded-full transition-all hover:bg-white/5">
            Download for Desktop
          </a>
        </div>
        <p className="text-voxa-text-dim text-sm mt-6">Free forever · No credit card required</p>
      </div>
    </section>
  )
}

const features = [
  {
    icon: MessageSquare,
    title: 'Text & Rich Messaging',
    desc: 'Send messages, share files, embed links, use markdown, react with emoji — everything you need to express yourself.'
  },
  {
    icon: Mic,
    title: 'Crystal-Clear Voice',
    desc: 'Low-latency, noise-suppressed voice channels so you can always hear each other perfectly.'
  },
  {
    icon: Video,
    title: 'Video & Screenshare',
    desc: 'Go face-to-face with video calls or share your screen for gaming, studying, or collaboration.'
  },
  {
    icon: Users,
    title: 'Servers & Communities',
    desc: 'Create your own server with unlimited channels, roles, and permissions. Grow from 2 to 2 million.'
  },
  {
    icon: Shield,
    title: 'Privacy & Safety',
    desc: 'Powerful moderation tools, content filters, and privacy settings keep your community safe.'
  },
  {
    icon: Zap,
    title: 'Blazing Fast',
    desc: 'Real-time messaging with zero perceptible lag. Messages appear instantly, always.'
  },
  {
    icon: Globe,
    title: 'Cross Platform',
    desc: 'Browser, Windows, Mac, Linux, iOS, Android — Voxa goes wherever you go.'
  },
  {
    icon: Headphones,
    title: 'Stage Channels',
    desc: 'Host talks, podcasts, AMAs, and events with audience-only listening modes built in.'
  },
]

function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-voxa-header tracking-tight mb-4">
            Everything you need to<br /><span className="text-voxa-red">connect</span>
          </h2>
          <p className="text-voxa-text-muted text-lg max-w-xl mx-auto">
            All the tools for a great community — and then some. Free.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-voxa-sidebar rounded-2xl p-6 hover:bg-voxa-hover transition-colors group">
              <div className="w-10 h-10 bg-voxa-red/15 rounded-xl flex items-center justify-center mb-4 group-hover:bg-voxa-red/25 transition-colors">
                <f.icon size={20} className="text-voxa-red" />
              </div>
              <h3 className="font-bold text-voxa-header mb-2">{f.title}</h3>
              <p className="text-sm text-voxa-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="py-16 px-6 bg-voxa-sidebar-dark">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { value: '19M+', label: 'Active Servers' },
          { value: '500M+', label: 'Messages/Day' },
          { value: '196', label: 'Countries' },
          { value: '100%', label: 'Free Core Features' },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-4xl font-black text-voxa-red mb-1">{s.value}</div>
            <div className="text-voxa-text-muted text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Create your account', desc: 'Sign up in seconds — just a username, email, and password. No phone number needed.' },
    { n: '02', title: 'Create or join a server', desc: 'Start your own community or get an invite link from a friend to join theirs.' },
    { n: '03', title: 'Set up channels', desc: 'Organize conversations into text channels, voice channels, and announcement channels.' },
    { n: '04', title: 'Invite your people', desc: 'Share an invite link and your whole group is in — chatting, calling, and hanging out.' },
  ]
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-voxa-header tracking-tight mb-4">
            Up and running in <span className="text-voxa-red">minutes</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-5 bg-voxa-sidebar rounded-2xl p-6">
              <div className="text-voxa-red font-black text-3xl leading-none opacity-60 w-10 shrink-0">{s.n}</div>
              <div>
                <h3 className="font-bold text-voxa-header mb-1">{s.title}</h3>
                <p className="text-sm text-voxa-text-muted leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-gradient-to-br from-voxa-red/20 to-voxa-red/5 border border-voxa-red/20 rounded-3xl p-14">
          <h2 className="text-5xl font-black text-voxa-header tracking-tight mb-4">
            Ready to start talking?
          </h2>
          <p className="text-voxa-text-muted text-lg mb-8">
            Join millions of communities. It's free, forever.
          </p>
          <Link
            to="/login?mode=register"
            className="inline-flex items-center gap-2 bg-voxa-red hover:bg-voxa-red-light text-white font-bold text-lg px-10 py-4 rounded-full transition-all hover:shadow-2xl hover:shadow-voxa-red/40"
          >
            Sign Up — It's Free
            <ChevronRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-voxa-sidebar-dark border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-voxa-red rounded-md flex items-center justify-center">
                <span className="text-white font-black text-base leading-none">v</span>
              </div>
              <span className="text-voxa-header font-bold text-lg">voxa</span>
            </div>
            <p className="text-voxa-text-dim text-xs leading-relaxed">
              Your place to talk. Free voice, video, and text for everyone.
            </p>
          </div>
          {[
            { title: 'Product', links: ['Download', 'Nitro', 'Status', 'Changelog'] },
            { title: 'Company', links: ['About', 'Jobs', 'Brand', 'Newsroom'] },
            { title: 'Resources', links: ['Community', 'Support', 'Safety', 'Blog'] },
            { title: 'Policies', links: ['Terms', 'Privacy', 'Cookie Policy', 'Guidelines'] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-voxa-header font-semibold text-xs uppercase tracking-widest mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-voxa-text-muted hover:text-voxa-header text-sm transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-voxa-text-dim text-xs">
          <span>© 2025 Voxa. All rights reserved.</span>
          <span>voxa.lol</span>
        </div>
      </div>
    </footer>
  )
}
