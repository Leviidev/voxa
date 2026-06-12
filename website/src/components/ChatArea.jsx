import { useState, useRef, useEffect } from 'react'
import { Hash, Plus, Smile, Bell, Pin, Users, Search, Volume2, Trash2, Edit3, Check, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useMessages } from '../hooks/useMessages.js'
import clsx from 'clsx'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

export default function ChatArea({ channel, server }) {
  const { user } = useAuth()
  const { messages, loading, addMessage, deleteMessage, editMessage } = useMessages(channel?.id)
  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [channel?.id])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !user) return
    const text = input.trim()
    setInput('')
    await addMessage(text, user)
  }

  const submitEdit = async (id) => {
    if (editVal.trim()) await editMessage(id, editVal.trim())
    setEditingId(null)
  }

  if (channel?.type === 'voice') {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center gap-4 text-[#96989D]">
        <div className="w-20 h-20 rounded-2xl bg-[#F2F3F5] flex items-center justify-center border border-[#E3E5E8]">
          <Volume2 size={32} className="text-[#96989D]" />
        </div>
        <div className="text-center">
          <div className="text-[#1A1B1E] font-bold text-lg mb-1">{channel.name}</div>
          <p className="text-sm text-[#5C6068]">Voice Channel</p>
        </div>
        <button className="bg-[#23a55a] hover:bg-[#1e9150] text-white font-semibold px-8 py-2.5 rounded-full transition-colors text-sm">
          Join Voice Channel
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 px-4 flex items-center gap-2.5 border-b border-[#E3E5E8] shrink-0 bg-white">
        <Hash size={18} className="text-[#96989D] shrink-0" />
        <span className="font-semibold text-[#1A1B1E] text-sm">{channel?.name ?? 'general'}</span>
        {channel?.name && (
          <>
            <div className="w-px h-4 bg-[#E3E5E8] mx-1 hidden sm:block" />
            <span className="text-[#96989D] text-xs hidden sm:block truncate">
              {channel.name === 'general' ? 'Home base 🏠' : `#${channel.name}`}
            </span>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <TopBtn icon={Bell} label="Notifications" />
          <TopBtn icon={Pin} label="Pinned" />
          <TopBtn icon={Users} label="Members" onClick={() => setShowMembers(v => !v)} active={showMembers} />
          <div className="mx-1 bg-[#F2F3F5] border border-[#E3E5E8] rounded-lg flex items-center px-2 h-7 gap-1.5 cursor-text">
            <Search size={12} className="text-[#96989D]" />
            <span className="text-xs text-[#96989D] w-14 hidden sm:block">Search</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollable px-4 py-4 flex flex-col gap-0.5">
          {loading && messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
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
                isOwn={msg.authorId === user?.id || msg.author === user?.username}
                editing={editingId === msg.id}
                editVal={editVal}
                onEditVal={setEditVal}
                onStartEdit={() => { setEditingId(msg.id); setEditVal(msg.content) }}
                onSubmitEdit={() => submitEdit(msg.id)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteMessage(msg.id)}
              />
            )
          })}
          <div ref={bottomRef} />
        </div>

        {showMembers && server && <MemberList members={server.members} />}
      </div>

      {/* Input */}
      <div className="px-4 pb-5 shrink-0">
        <form onSubmit={sendMessage} className="bg-[#F2F3F5] border border-[#E3E5E8] rounded-xl flex items-center gap-2 px-4 focus-within:ring-2 focus-within:ring-[#E53935]/20 focus-within:border-[#E53935]/40 transition-all">
          <button type="button" className="text-[#96989D] hover:text-[#5C6068] py-3 shrink-0 transition-colors">
            <Plus size={18} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setInput('') }}
            placeholder={`Message #${channel?.name ?? 'general'}`}
            className="flex-1 bg-transparent text-[#1A1B1E] text-sm py-3 outline-none placeholder:text-[#96989D]"
          />
          <button type="button" className="text-[#96989D] hover:text-[#5C6068] transition-colors p-1">
            <Smile size={17} />
          </button>
        </form>
        <p className="text-[#96989D] text-xs mt-1 px-1">
          Press <kbd className="bg-[#F2F3F5] border border-[#E3E5E8] px-1.5 py-0.5 rounded text-[10px] font-mono">Enter</kbd> to send
        </p>
      </div>
    </div>
  )
}

function TopBtn({ icon: Icon, label, onClick, active }) {
  return (
    <button title={label} onClick={onClick}
      className={clsx(
        'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
        active ? 'bg-[#E0E2E6] text-[#1A1B1E]' : 'text-[#96989D] hover:bg-[#F2F3F5] hover:text-[#5C6068]'
      )}>
      <Icon size={17} />
    </button>
  )
}

function ChannelWelcome({ channel }) {
  return (
    <div className="mb-6 pb-4 border-b border-[#F2F3F5]">
      <div className="w-12 h-12 rounded-2xl bg-[#F2F3F5] border border-[#E3E5E8] flex items-center justify-center mb-3">
        <Hash size={22} className="text-[#96989D]" />
      </div>
      <h3 className="text-xl font-black text-[#1A1B1E] mb-1">Welcome to #{channel?.name ?? 'general'}</h3>
      <p className="text-[#5C6068] text-sm">This is the start of the #{channel?.name ?? 'general'} channel.</p>
    </div>
  )
}

function Message({ msg, grouped, isOwn, editing, editVal, onEditVal, onStartEdit, onSubmitEdit, onCancelEdit, onDelete }) {
  const color = avatarColor(msg.author)
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (editing) {
    return (
      <div className="flex items-start gap-3 px-3 -mx-3 py-2 rounded-xl bg-[#FFF5F5] border border-[#FECDD3] mt-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5"
          style={{ background: color }}>
          {msg.author?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-[#1A1B1E] text-sm">{msg.author}</span>
            <span className="text-[#96989D] text-xs">{time}</span>
          </div>
          <input autoFocus value={editVal} onChange={e => onEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmitEdit(); if (e.key === 'Escape') onCancelEdit() }}
            className="w-full bg-white border border-[#E3E5E8] text-[#1A1B1E] text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935]"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={onSubmitEdit} className="flex items-center gap-1 text-xs text-[#23a55a] hover:text-[#1e9150] font-medium transition-colors">
              <Check size={12} /> Save
            </button>
            <button onClick={onCancelEdit} className="flex items-center gap-1 text-xs text-[#96989D] hover:text-[#5C6068] transition-colors">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (grouped) return (
    <div className="flex items-start gap-4 pl-12 group hover:bg-[#F7F8FA] rounded-xl px-3 -mx-3 py-0.5">
      <span className="text-[#96989D] text-[10px] w-9 text-right opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 font-mono">{time}</span>
      <p className="text-sm text-[#313439] leading-relaxed flex-1">
        {msg.content}
        {msg.edited && <span className="text-[#96989D] text-[10px] ml-1">(edited)</span>}
      </p>
      {isOwn && <MessageActions onEdit={onStartEdit} onDelete={onDelete} />}
    </div>
  )

  return (
    <div className="flex items-start gap-3 group hover:bg-[#F7F8FA] rounded-xl px-3 -mx-3 py-1.5 mt-2">
      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5"
        style={{ background: color }}>
        {msg.author?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-[#1A1B1E] text-sm">{msg.author}</span>
          <span className="text-[#96989D] text-xs">{time}</span>
        </div>
        <p className="text-sm text-[#313439] leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-[#96989D] text-[10px] ml-1">(edited)</span>}
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
        className="w-7 h-7 rounded-lg bg-white border border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] hover:border-[#D5D7DC] shadow-sm transition-colors">
        <Edit3 size={12} />
      </button>
      <button onClick={onDelete} title="Delete"
        className="w-7 h-7 rounded-lg bg-white border border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:text-[#E53935] hover:border-red-200 shadow-sm transition-colors">
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function MemberList({ members }) {
  const statusColor = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#96989D' }
  const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']

  if (!members?.length) return (
    <div className="w-56 bg-[#F7F8FA] border-l border-[#E3E5E8] py-4 shrink-0">
      <div className="px-4 text-[#96989D] text-[10px] font-bold uppercase tracking-wider mb-3">Members — 0</div>
    </div>
  )

  const grouped = members.reduce((acc, m) => {
    const g = m.status === 'offline' ? 'Offline' : 'Online'
    ;(acc[g] = acc[g] ?? []).push(m)
    return acc
  }, {})

  return (
    <div className="w-56 bg-[#F7F8FA] border-l border-[#E3E5E8] overflow-y-auto scrollable py-3 shrink-0">
      {Object.entries(grouped).map(([group, mems]) => (
        <div key={group} className="mb-4 px-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#96989D] mb-2 px-1">
            {group} — {mems.length}
          </div>
          {mems.map(m => (
            <div key={m.id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#EAEBEE] cursor-pointer transition-colors">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs"
                  style={{ background: COLORS[m.username?.charCodeAt(0) % COLORS.length] }}>
                  {m.username?.[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F7F8FA]"
                  style={{ background: statusColor[m.status] ?? '#96989D' }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#5C6068] truncate">{m.username}</div>
                {m.role !== 'Member' && <div className="text-[10px] text-[#E53935] font-medium">{m.role}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
