import { useState, useRef, useEffect } from 'react'
import { Hash, Plus, Gift, Sticker, Smile, Bell, Pin, Users, Search, Inbox, HelpCircle, Volume2, Trash2, Edit3, Check, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useMessages } from '../hooks/useMessages.js'
import clsx from 'clsx'

export default function ChatArea({ channel, server }) {
  const { user } = useAuth()
  const { messages, addMessage, deleteMessage, editMessage } = useMessages(channel?.id)
  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [channel?.id])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    addMessage({
      id: 'msg_' + Date.now(),
      author: user?.username ?? 'You',
      discriminator: user?.discriminator ?? '0000',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      avatar: null,
    })
    setInput('')
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditVal(msg.content)
  }

  const submitEdit = (id) => {
    if (editVal.trim()) editMessage(id, editVal.trim())
    setEditingId(null)
  }

  if (channel?.type === 'voice') {
    return (
      <div className="flex-1 bg-voxa-chat flex flex-col items-center justify-center gap-4 text-voxa-text-muted">
        <div className="w-20 h-20 rounded-full bg-voxa-sidebar flex items-center justify-center">
          <Volume2 size={36} className="opacity-40" />
        </div>
        <div className="text-center">
          <div className="text-voxa-header font-bold text-lg mb-1">{channel.name}</div>
          <p className="text-sm mb-1">Voice Channel</p>
          {channel.members?.length > 0 && (
            <p className="text-xs text-voxa-text-dim">{channel.members.join(', ')} in channel</p>
          )}
        </div>
        <button className="bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-2.5 rounded-full transition-colors text-sm">
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
        <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />
        <span className="text-voxa-text-muted text-sm truncate hidden sm:block text-xs">
          {channel?.name === 'general' ? 'Where the magic happens ✨' : `Welcome to #${channel?.name}`}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 text-voxa-text-muted">
          <TopBtn icon={Bell} label="Notifications" />
          <TopBtn icon={Pin} label="Pinned Messages" />
          <TopBtn icon={Users} label="Member List" onClick={() => setShowMembers(v => !v)} active={showMembers} />
          <div className="mx-1 bg-voxa-input rounded flex items-center px-2 h-6 gap-1.5 cursor-text">
            <Search size={13} />
            <span className="text-xs text-voxa-text-dim w-14 hidden sm:block">Search</span>
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
            const grouped = prev?.author === msg.author &&
              (new Date(msg.timestamp) - new Date(prev.timestamp)) < 1000 * 60 * 5
            return (
              <Message
                key={msg.id}
                msg={msg}
                grouped={grouped}
                isOwn={msg.author === user?.username}
                editing={editingId === msg.id}
                editVal={editVal}
                onEditVal={setEditVal}
                onStartEdit={() => startEdit(msg)}
                onSubmitEdit={() => submitEdit(msg.id)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteMessage(msg.id)}
              />
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Member list */}
        {showMembers && server && <MemberListPanel members={server.members} />}
      </div>

      {/* Input */}
      <div className="px-4 pb-6 shrink-0">
        <form onSubmit={sendMessage} className="bg-voxa-input rounded-lg flex items-center gap-2 px-4">
          <button type="button" className="text-voxa-text-muted hover:text-voxa-header py-3 shrink-0 transition-colors">
            <Plus size={20} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setInput('') }}
            placeholder={`Message #${channel?.name ?? 'general'}`}
            className="flex-1 bg-transparent text-voxa-header text-sm py-3 outline-none placeholder:text-voxa-text-dim"
          />
          <div className="flex items-center gap-1 text-voxa-text-muted shrink-0">
            <button type="button" className="hover:text-voxa-header transition-colors p-1"><Gift size={18} /></button>
            <button type="button" className="hover:text-voxa-header transition-colors p-1"><Sticker size={18} /></button>
            <button type="button" className="hover:text-voxa-header transition-colors p-1"><Smile size={18} /></button>
          </div>
        </form>
        <p className="text-voxa-text-dim text-xs mt-1 px-1">
          Press <kbd className="bg-voxa-input px-1 rounded text-[10px]">Enter</kbd> to send
        </p>
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
      <p className="text-voxa-text-muted text-sm">This is the start of the #{channel?.name ?? 'general'} channel.</p>
      <div className="h-px bg-white/5 mt-6 mb-2" />
    </div>
  )
}

const AVATAR_COLORS = ['#E53935', '#8E24AA', '#1565C0', '#2E7D32', '#E65100', '#00838F', '#F57C00']

function Message({ msg, grouped, isOwn, editing, editVal, onEditVal, onStartEdit, onSubmitEdit, onCancelEdit, onDelete }) {
  const color = AVATAR_COLORS[msg.author?.charCodeAt(0) % AVATAR_COLORS.length]
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (editing) {
    return (
      <div className="flex items-start gap-3 px-2 -mx-2 py-1 mt-2 bg-voxa-red/5 rounded">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 mt-0.5" style={{ background: color }}>
          {msg.author?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-voxa-header text-sm">{msg.author}</span>
            <span className="text-voxa-text-dim text-xs">{time}</span>
          </div>
          <input
            autoFocus
            value={editVal}
            onChange={e => onEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmitEdit(); if (e.key === 'Escape') onCancelEdit() }}
            className="w-full bg-voxa-input text-voxa-header text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-voxa-red/50"
          />
          <div className="flex items-center gap-2 mt-1">
            <button onClick={onSubmitEdit} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
              <Check size={12} /> Save
            </button>
            <button onClick={onCancelEdit} className="flex items-center gap-1 text-xs text-voxa-text-muted hover:text-voxa-header">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (grouped) return (
    <div className="flex items-start gap-4 pl-14 group hover:bg-white/[0.02] rounded px-2 -mx-2 py-0.5">
      <span className="text-voxa-text-dim text-xs w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">{time}</span>
      <p className="text-sm text-voxa-text leading-relaxed flex-1">
        {msg.content}
        {msg.edited && <span className="text-voxa-text-dim text-[10px] ml-1">(edited)</span>}
      </p>
      {isOwn && <MessageActions onEdit={onStartEdit} onDelete={onDelete} />}
    </div>
  )

  return (
    <div className="flex items-start gap-3 group hover:bg-white/[0.02] rounded px-2 -mx-2 py-1 mt-2">
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 mt-0.5" style={{ background: color }}>
        {msg.author?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-voxa-header text-sm hover:underline cursor-pointer">{msg.author}</span>
          <span className="text-voxa-text-dim text-xs">{time}</span>
        </div>
        <p className="text-sm text-voxa-text leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-voxa-text-dim text-[10px] ml-1">(edited)</span>}
        </p>
      </div>
      {isOwn && <MessageActions onEdit={onStartEdit} onDelete={onDelete} />}
    </div>
  )
}

function MessageActions({ onEdit, onDelete }) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
      <button onClick={onEdit} title="Edit"
        className="w-7 h-7 rounded bg-voxa-hover flex items-center justify-center text-voxa-text-muted hover:text-voxa-header hover:bg-voxa-selected transition-colors">
        <Edit3 size={13} />
      </button>
      <button onClick={onDelete} title="Delete"
        className="w-7 h-7 rounded bg-voxa-hover flex items-center justify-center text-voxa-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function MemberListPanel({ members }) {
  if (!members?.length) return (
    <div className="w-60 bg-voxa-chat border-l border-black/20 py-4 shrink-0">
      <div className="px-4 text-voxa-text-dim text-xs font-semibold uppercase tracking-wider mb-3">Members — 0</div>
      <div className="px-4 text-voxa-text-dim text-xs text-center mt-8">No members yet</div>
    </div>
  )

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
            <div key={m.id}
              className="flex items-center gap-3 px-2 mx-2 py-1.5 rounded hover:bg-voxa-hover cursor-pointer group transition-colors">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs"
                  style={{ background: AVATAR_COLORS[m.username.charCodeAt(0) % AVATAR_COLORS.length] }}>
                  {m.username[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-voxa-chat"
                  style={{ background: statusColor[m.status] ?? '#80848e' }} />
              </div>
              <div>
                <div className="text-sm font-medium text-voxa-text-muted group-hover:text-voxa-header transition-colors">{m.username}</div>
                {m.role !== 'Member' && <div className="text-xs text-voxa-red">{m.role}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
