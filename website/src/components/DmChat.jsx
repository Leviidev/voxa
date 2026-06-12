import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, Edit3, Check, X, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../context/SocketContext.jsx'
import { useUnread } from '../context/UnreadContext.jsx'
import { api } from '../lib/api.js'
import clsx from 'clsx'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

export default function DmChat() {
  const { dmId } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()
  const { markDmRead } = useUnread()
  const navigate = useNavigate()
  const [other, setOther] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const prevDmId = useRef(dmId)

  useEffect(() => {
    if (!dmId) return
    setLoading(true)
    Promise.all([
      api.getDms(),
      api.getDmMessages(dmId),
    ]).then(([dms, msgs]) => {
      const dm = dms.find(d => d.id === dmId)
      setOther(dm?.other ?? null)
      setMessages(msgs)
      markDmRead(dmId)
    }).catch(() => navigate('/voxa/me')).finally(() => setLoading(false))
  }, [dmId])

  useEffect(() => {
    if (dmId !== prevDmId.current) {
      if (socket && prevDmId.current) socket.emit('dm:leave', prevDmId.current)
    }
    prevDmId.current = dmId
    if (socket && dmId) socket.emit('dm:join', dmId)
    return () => { if (socket && dmId) socket.emit('dm:leave', dmId) }
  }, [socket, dmId])

  useEffect(() => {
    if (!socket) return
    const onNew = (msg) => {
      if (msg.dmChannelId !== dmId) return
      setMessages(prev => [...prev, msg])
    }
    const onEdit = (msg) => {
      if (msg.dmChannelId !== dmId) return
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    }
    const onDelete = ({ id }) => {
      setMessages(prev => prev.filter(m => m.id !== id))
    }
    socket.on('dm:message:new', onNew)
    socket.on('dm:message:edit', onEdit)
    socket.on('dm:message:delete', onDelete)
    return () => {
      socket.off('dm:message:new', onNew)
      socket.off('dm:message:edit', onEdit)
      socket.off('dm:message:delete', onDelete)
    }
  }, [socket, dmId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { inputRef.current?.focus() }, [dmId])

  const sendMessage = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setSendError('')
    try {
      await api.sendDmMessage(dmId, text)
    } catch (err) {
      setSendError(err.message)
      setInput(text)
    }
  }

  const startEdit = (msg) => { setEditingId(msg.id); setEditVal(msg.content) }
  const cancelEdit = () => { setEditingId(null); setEditVal('') }
  const saveEdit = async (msg) => {
    if (!editVal.trim() || editVal === msg.content) return cancelEdit()
    try {
      await api.editDmMessage(dmId, msg.id, editVal.trim())
      cancelEdit()
    } catch {}
  }

  const deleteMsg = async (msg) => {
    if (!confirm('Delete this message?')) return
    try { await api.deleteDmMessage(dmId, msg.id) } catch {}
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-7 h-7 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const otherColor = other ? (other.avatarColor ?? avatarColor(other.username)) : '#E53935'
  const otherName = other ? (other.displayName ?? other.username) : '...'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-[#E3E5E8] shrink-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
          style={{ background: other?.avatarUrl ? undefined : otherColor }}>
          {other?.avatarUrl
            ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
            : otherName[0]?.toUpperCase()}
        </div>
        <span className="font-bold text-[#1A1B1E] text-sm">{otherName}</span>
        {other?.discriminator && (
          <span className="text-[#96989D] text-xs font-normal">#{other.discriminator}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollable px-4 py-4 flex flex-col gap-0.5">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
              style={{ background: other?.avatarUrl ? undefined : otherColor }}>
              {other?.avatarUrl
                ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                : otherName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#1A1B1E] text-lg">{otherName}</p>
              <p className="text-[#96989D] text-sm mt-1">This is the beginning of your direct message history with <strong>{otherName}</strong>.</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const grouped = prev?.authorId === msg.authorId &&
            new Date(msg.timestamp) - new Date(prev.timestamp) < 5 * 60 * 1000
          const isMe = msg.authorId === user?.id
          const color = msg.avatarColor ?? avatarColor(msg.author)
          const name = msg.displayName ?? msg.author

          return (
            <div key={msg.id}
              className={clsx('flex gap-3 group px-2 py-0.5 rounded-xl hover:bg-[#F7F8FA] transition-colors', grouped && 'mt-0')}>
              {!grouped ? (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 overflow-hidden"
                  style={{ background: msg.avatarUrl ? undefined : color }}>
                  {msg.avatarUrl
                    ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : name[0]?.toUpperCase()}
                </div>
              ) : (
                <div className="w-9 shrink-0 flex items-center justify-end">
                  <span className="text-[10px] text-[#96989D] opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!grouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-semibold text-[#1A1B1E] text-sm">{name}</span>
                    <span className="text-[10px] text-[#96989D]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {editingId === msg.id ? (
                  <div className="flex gap-2 items-end">
                    <textarea
                      className="flex-1 bg-[#F2F3F5] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none focus:ring-2 focus:ring-[#E53935]/20 resize-none border border-[#E3E5E8] focus:border-[#E53935]"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg) } if (e.key === 'Escape') cancelEdit() }}
                      rows={1}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(msg)} className="w-7 h-7 rounded-lg bg-[#23a55a] flex items-center justify-center text-white hover:bg-[#1a8f4a] transition-colors shrink-0">
                      <Check size={13} />
                    </button>
                    <button onClick={cancelEdit} className="w-7 h-7 rounded-lg bg-[#E3E5E8] flex items-center justify-center text-[#5C6068] hover:bg-[#D5D7DC] transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[#313439] text-sm leading-relaxed break-words">
                    {msg.content}
                    {msg.edited && <span className="text-[10px] text-[#96989D] ml-1">(edited)</span>}
                  </p>
                )}
              </div>

              {isMe && editingId !== msg.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(msg)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#96989D] hover:bg-[#EAEBEE] hover:text-[#5C6068] transition-colors">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => deleteMsg(msg)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#96989D] hover:bg-[#E53935]/10 hover:text-[#E53935] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        {sendError && (
          <p className="text-[#E53935] text-xs mb-2 px-1">{sendError}</p>
        )}
        <form onSubmit={sendMessage} className="flex items-center gap-2 bg-[#F2F3F5] rounded-2xl px-4 py-3 border border-[#E3E5E8] focus-within:border-[#E53935]/30 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${otherName}`}
            className="flex-1 bg-transparent text-[#1A1B1E] text-sm outline-none placeholder:text-[#96989D]"
          />
          <button type="submit" disabled={!input.trim()}
            className="w-7 h-7 rounded-lg bg-[#E53935] disabled:opacity-30 flex items-center justify-center text-white hover:bg-[#C62828] transition-colors shrink-0">
            <MessageSquare size={13} />
          </button>
        </form>
      </div>
    </div>
  )
}
