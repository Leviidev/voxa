import { useState, useRef, useEffect } from 'react'
import { X, Hash, Plus, Smile } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useThread } from '../hooks/useThread.js'
import clsx from 'clsx'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

export default function ThreadPanel({ parentId, channelName, onClose }) {
  const { user } = useAuth()
  const { parent, replies, loading, addReply } = useThread(parentId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  useEffect(() => { inputRef.current?.focus() }, [parentId])

  const send = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !user || sending) return
    setSending(true)
    setInput('')
    try { await addReply(text, user) } finally { setSending(false) }
  }

  return (
    <div className="w-[340px] bg-[#2B2D31] border-l border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">Thread</span>
          {channelName && (
            <>
              <span className="text-[#6B6E75] text-xs">in</span>
              <span className="flex items-center gap-0.5 text-[#6B6E75] text-xs">
                <Hash size={11} />
                {channelName}
              </span>
            </>
          )}
        </div>
        <button onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B6E75] hover:bg-white/[0.08] hover:text-[#DBDEE1] transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollable px-4 py-3 flex flex-col gap-0">
        {loading && !parent && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {parent && (
          <>
            <ThreadMessage msg={parent} isParent />
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] font-semibold text-[#6B6E75] uppercase tracking-widest whitespace-nowrap">
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
              </span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          </>
        )}

        {replies.map((r, i) => {
          const prev = replies[i - 1]
          const grouped = prev?.author === r.author &&
            (new Date(r.timestamp) - new Date(prev.timestamp)) < 1000 * 60 * 5
          return <ThreadMessage key={r.id} msg={r} grouped={grouped} />
        })}

        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="px-3 pb-4 shrink-0">
        <form onSubmit={send}
          className="bg-[#383A40] border border-white/[0.06] rounded-xl flex items-center gap-2 px-3 focus-within:border-white/[0.12] transition-all">
          <button type="button" className="text-[#6B6E75] hover:text-[#949BA4] py-2.5 shrink-0 transition-colors">
            <Plus size={16} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setInput('') }}
            placeholder="Reply in thread…"
            className="flex-1 bg-transparent text-[#DBDEE1] text-sm py-2.5 outline-none placeholder:text-[#6B6E75]"
            maxLength={2000}
            disabled={sending}
          />
          <button type="button" className="text-[#6B6E75] hover:text-[#949BA4] transition-colors p-0.5">
            <Smile size={15} />
          </button>
        </form>
        <p className="text-[#6B6E75] text-[10px] mt-1 px-1">
          Press <kbd className="bg-white/[0.06] border border-white/[0.08] px-1 py-0.5 rounded text-[9px] font-mono">Enter</kbd> to reply
        </p>
      </div>
    </div>
  )
}

function ThreadMessage({ msg, grouped, isParent }) {
  const color = msg.avatarColor || avatarColor(msg.author)
  const isOptimistic = msg.id?.startsWith('opt_')
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (grouped && !isParent) return (
    <div className={clsx('flex items-start gap-4 pl-9 group py-0.5 rounded-lg -mx-1 px-1 hover:bg-white/[0.02]', isOptimistic && 'opacity-60')}>
      <span className="text-[#6B6E75] text-[10px] w-7 text-right opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 font-mono">{time}</span>
      <p className="text-sm text-[#DBDEE1] leading-relaxed flex-1">
        {msg.content}
        {msg.edited && <span className="text-[#6B6E75] text-[10px] ml-1">(edited)</span>}
      </p>
    </div>
  )

  return (
    <div className={clsx(
      'flex items-start gap-2.5 rounded-xl -mx-1 px-1 py-1.5',
      isParent ? 'bg-white/[0.04] border border-white/[0.06] px-3 py-3' : 'mt-1.5 hover:bg-white/[0.02]',
      isOptimistic && 'opacity-60',
    )}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5 overflow-hidden"
        style={{ background: msg.avatarUrl ? undefined : color }}>
        {msg.avatarUrl
          ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
          : msg.author?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="font-semibold text-[#DBDEE1] text-sm">{msg.displayName ?? msg.author}</span>
          <span className="text-[#6B6E75] text-[10px]">{time}</span>
          {isOptimistic && <span className="text-[#6B6E75] text-[10px]">sending…</span>}
        </div>
        <p className="text-sm text-[#DBDEE1] leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-[#6B6E75] text-[10px] ml-1">(edited)</span>}
        </p>
      </div>
    </div>
  )
}
