import { useState, useRef, useEffect } from 'react'
import { Hash, Plus, Gift, Sticker, Smile, AtSign, Bell, Pin, Users, Search, Inbox, HelpCircle, Volume2 } from 'lucide-react'
import { MOCK_MESSAGES } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import clsx from 'clsx'

export default function ChatArea({ channel, server }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState(MOCK_MESSAGES[channel?.id] ?? [])
  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages(MOCK_MESSAGES[channel?.id] ?? [])
  }, [channel?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const msg = {
      id: 'msg_' + Date.now(),
      author: user?.username ?? 'You',
      discriminator: user?.discriminator ?? '0000',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      avatar: null,
    }
    setMessages(m => [...m, msg])
    setInput('')
  }

  if (channel?.type === 'voice') {
    return (
      <div className="flex-1 bg-voxa-chat flex flex-col items-center justify-center gap-4 text-voxa-text-muted">
        <Volume2 size={48} className="opacity-30" />
        <div className="text-center">
          <div className="text-voxa-header font-bold text-lg mb-1">{channel.name}</div>
          <p className="text-sm">Voice Channel — click to join</p>
        </div>
        <button className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm">
          Join Voice Channel
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-voxa-chat overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-black/20 shrink-0">
        <Hash size={20} className="text-voxa-text-muted shrink-0" />
        <span className="font-semibold text-voxa-header text-sm">{channel?.name ?? 'general'}</span>
        {channel?.name && (
          <>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <span className="text-voxa-text-muted text-sm truncate hidden sm:block">
              {channel.name === 'general' ? 'Where the magic happens ✨' : `#${channel.name} channel`}
            </span>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-voxa-text-muted">
          <TopBtn icon={Bell} label="Notifications" />
          <TopBtn icon={Pin} label="Pinned Messages" />
          <TopBtn icon={Users} label="Member List" onClick={() => setShowMembers(v => !v)} active={showMembers} />
          <div className="mx-1 bg-voxa-input rounded flex items-center px-2 h-6 gap-1.5 cursor-text">
            <Search size={13} />
            <span className="text-xs text-voxa-text-dim w-16">Search</span>
          </div>
          <TopBtn icon={Inbox} label="Inbox" />
          <TopBtn icon={HelpCircle} label="Help" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollable px-4 py-4 flex flex-col gap-0.5">
          <ChannelWelcome channel={channel} />
          {messages.map((msg, i) => {
            const prev = messages[i - 1]
            const grouped = prev?.author === msg.author && (new Date(msg.timestamp) - new Date(prev.timestamp)) < 1000 * 60 * 5
            return <Message key={msg.id} msg={msg} grouped={grouped} isOwn={msg.author === user?.username} />
          })}
          <div ref={bottomRef} />
        </div>

        {/* Member list */}
        {showMembers && server && <MemberListPanel members={server.members} />}
      </div>

      {/* Input */}
      <div className="px-4 pb-6 shrink-0">
        <form onSubmit={sendMessage}
          className="bg-voxa-input rounded-lg flex items-center gap-2 px-4">
          <button type="button" className="text-voxa-text-muted hover:text-voxa-header py-3 shrink-0 transition-colors">
            <Plus size={20} />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message #${channel?.name ?? 'general'}`}
            className="flex-1 bg-transparent text-voxa-header text-sm py-3 outline-none placeholder:text-voxa-text-dim"
          />
          <div className="flex items-center gap-1 text-voxa-text-muted">
            <button type="button" className="hover:text-voxa-header transition-colors p-1"><Gift size={18} /></button>
            <button type="button" className="hover:text-voxa-header transition-colors p-1"><Sticker size={18} /></button>
            <button type="button" className="hover:text-voxa-header transition-colors p-1"><Smile size={18} /></button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TopBtn({ icon: Icon, label, onClick, active }) {
  return (
    <button title={label} onClick={onClick}
      className={clsx('w-8 h-8 flex items-center justify-center rounded hover:bg-voxa-hover transition-colors',
        active ? 'text-voxa-header' : 'text-voxa-text-muted hover:text-voxa-header')}>
      <Icon size={18} />
    </button>
  )
}

function ChannelWelcome({ channel }) {
  return (
    <div className="mb-6">
      <div className="w-14 h-14 rounded-full bg-voxa-sidebar flex items-center justify-center mb-4">
        <Hash size={28} className="text-voxa-text-muted" />
      </div>
      <h3 className="text-2xl font-black text-voxa-header mb-1">Welcome to #{channel?.name ?? 'general'}!</h3>
      <p className="text-voxa-text-muted text-sm">
        This is the start of the #{channel?.name ?? 'general'} channel.
      </p>
      <div className="h-px bg-white/5 mt-6" />
    </div>
  )
}

function Message({ msg, grouped, isOwn }) {
  const colors = ['#E53935', '#8E24AA', '#1565C0', '#2E7D32', '#E65100', '#00838F']
  const color = colors[msg.author?.charCodeAt(0) % colors.length] ?? '#E53935'
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (grouped) return (
    <div className="flex items-start gap-4 pl-14 group hover:bg-white/[0.02] rounded px-2 -mx-2 py-0.5">
      <span className="text-voxa-text-dim text-xs w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">{time}</span>
      <p className="text-sm text-voxa-text leading-relaxed">{msg.content}</p>
    </div>
  )

  return (
    <div className="flex items-start gap-3 group hover:bg-white/[0.02] rounded px-2 -mx-2 py-1 mt-2">
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 mt-0.5"
        style={{ background: color }}>
        {msg.author?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-voxa-header text-sm hover:underline cursor-pointer">{msg.author}</span>
          <span className="text-voxa-text-dim text-xs">{time}</span>
        </div>
        <p className="text-sm text-voxa-text leading-relaxed">{msg.content}</p>
      </div>
    </div>
  )
}

function MemberListPanel({ members }) {
  const grouped = members.reduce((acc, m) => {
    const g = m.role === 'Admin' ? 'Admin' : m.role === 'Moderator' ? 'Moderator' : m.status === 'offline' ? 'Offline' : 'Members'
    ;(acc[g] = acc[g] ?? []).push(m)
    return acc
  }, {})

  const statusColor = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#80848e' }

  return (
    <div className="w-60 bg-voxa-chat border-l border-black/20 overflow-y-auto scrollable py-4 shrink-0">
      {Object.entries(grouped).map(([group, mems]) => (
        <div key={group} className="mb-4">
          <div className="px-4 mb-2 text-voxa-text-dim text-xs font-semibold uppercase tracking-wider">
            {group} — {mems.length}
          </div>
          {mems.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-2 mx-2 py-1.5 rounded hover:bg-voxa-hover cursor-pointer group">
              <div className="relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs"
                  style={{ background: statusColor[m.status] === '#23a55a' ? '#E53935' : '#4a4b50' }}>
                  {m.username[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-voxa-chat"
                  style={{ background: statusColor[m.status] }} />
              </div>
              <div>
                <div className="text-sm font-medium text-voxa-text-muted group-hover:text-voxa-header">{m.username}</div>
                {m.role !== 'Member' && <div className="text-xs text-voxa-red">{m.role}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
