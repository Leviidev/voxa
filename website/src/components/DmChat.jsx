import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, Edit3, Check, X, MessageSquare, Flag, Plus, Smile } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../context/SocketContext.jsx'
import { useUnread } from '../context/UnreadContext.jsx'
import UserProfileCard from './UserProfileCard.jsx'
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
  const [activeProfile, setActiveProfile] = useState(null)
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
    const onNew = (msg) => { if (msg.dmChannelId !== dmId) return; setMessages(prev => [...prev, msg]) }
    const onEdit = (msg) => { if (msg.dmChannelId !== dmId) return; setMessages(prev => prev.map(m => m.id === msg.id ? msg : m)) }
    const onDelete = ({ id }) => setMessages(prev => prev.filter(m => m.id !== id))
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
    try { await api.editDmMessage(dmId, msg.id, editVal.trim()); cancelEdit() } catch {}
  }

  const deleteMsg = async (msg) => {
    if (!confirm('Delete this message?')) return
    try { await api.deleteDmMessage(dmId, msg.id) } catch {}
  }

  const openProfile = useCallback((person, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveProfile({ member: person, anchorRect: rect })
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#313338]">
      <div className="w-7 h-7 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const otherColor = other ? (other.avatarColor ?? avatarColor(other.username)) : '#E53935'
  const otherName = other ? (other.displayName ?? other.username) : '...'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338]">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-white/[0.06] shrink-0 bg-[#313338]">
        <button
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          onClick={(e) => other && openProfile(other, e)}
          title={other ? `View ${otherName}'s profile` : undefined}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
            style={{ background: other?.avatarUrl ? undefined : otherColor }}>
            {other?.avatarUrl
              ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
              : otherName[0]?.toUpperCase()}
          </div>
          <span className="font-bold text-white text-sm">{otherName}</span>
          {other?.discriminator && (
            <span className="text-[#6B6E75] text-xs font-normal">#{other.discriminator}</span>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollable px-4 py-4 flex flex-col gap-0.5">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: other?.avatarUrl ? undefined : otherColor }}
              onClick={(e) => other && openProfile(other, e)}
            >
              {other?.avatarUrl
                ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                : otherName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white text-lg">{otherName}</p>
              <p className="text-[#949BA4] text-sm mt-1">
                This is the beginning of your direct message history with <strong className="text-[#DBDEE1]">{otherName}</strong>.
              </p>
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
          const msgPerson = {
            id: msg.authorId,
            username: msg.author,
            displayName: msg.displayName,
            avatarUrl: msg.avatarUrl,
            avatarColor: msg.avatarColor,
            status: isMe ? (user?.status || 'online') : (other?.status || 'offline'),
            discriminator: isMe ? user?.discriminator : other?.discriminator,
          }

          return (
            <div key={msg.id}
              className={clsx('flex gap-3 group px-2 py-0.5 rounded-xl hover:bg-white/[0.03] transition-colors', grouped && 'mt-0')}>
              {!grouped ? (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: msg.avatarUrl ? undefined : color }}
                  onClick={(e) => openProfile(msgPerson, e)}
                >
                  {msg.avatarUrl
                    ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : name[0]?.toUpperCase()}
                </div>
              ) : (
                <div className="w-9 shrink-0 flex items-center justify-end">
                  <span className="text-[10px] text-[#6B6E75] opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!grouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span
                      className="font-semibold text-[#DBDEE1] text-sm cursor-pointer hover:underline"
                      onClick={(e) => openProfile(msgPerson, e)}
                    >
                      {name}
                    </span>
                    <span className="text-[10px] text-[#6B6E75]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {editingId === msg.id ? (
                  <div className="flex gap-2 items-end">
                    <textarea
                      className="flex-1 bg-[#383A40] rounded-xl px-3 py-2 text-sm text-[#DBDEE1] outline-none focus:ring-2 focus:ring-[#E53935]/20 resize-none border border-white/[0.08] focus:border-[#E53935]/50"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg) } if (e.key === 'Escape') cancelEdit() }}
                      rows={1}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(msg)} className="w-7 h-7 rounded-lg bg-[#23a55a] flex items-center justify-center text-white hover:bg-[#1a8f4a] transition-colors shrink-0">
                      <Check size={13} />
                    </button>
                    <button onClick={cancelEdit} className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-[#949BA4] hover:bg-white/[0.12] transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[#DBDEE1] text-sm leading-relaxed break-words">
                    {msg.content}
                    {msg.edited && <span className="text-[10px] text-[#6B6E75] ml-1">(edited)</span>}
                  </p>
                )}
              </div>

              {editingId !== msg.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!isMe && (
                    <DmMsgBtn title="Report" onClick={async () => {
                      try { await api.reportMessage(msg.id, 'Reported in DM') } catch {}
                    }} danger>
                      <Flag size={12} />
                    </DmMsgBtn>
                  )}
                  {isMe && (
                    <>
                      <DmMsgBtn title="Edit" onClick={() => startEdit(msg)}>
                        <Edit3 size={12} />
                      </DmMsgBtn>
                      <DmMsgBtn title="Delete" onClick={() => deleteMsg(msg)} danger>
                        <Trash2 size={12} />
                      </DmMsgBtn>
                    </>
                  )}
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
        <form onSubmit={sendMessage}
          className="flex items-center gap-2 bg-[#383A40] rounded-2xl px-4 py-3 border border-white/[0.06] focus-within:border-white/[0.12] transition-colors">
          <button type="button" className="text-[#6B6E75] hover:text-[#949BA4] transition-colors shrink-0">
            <Plus size={18} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${otherName}`}
            className="flex-1 bg-transparent text-[#DBDEE1] text-sm outline-none placeholder:text-[#6B6E75]"
            maxLength={2000}
          />
          <button type="button" className="text-[#6B6E75] hover:text-[#949BA4] transition-colors shrink-0">
            <Smile size={17} />
          </button>
        </form>
        <p className="text-[#6B6E75] text-xs mt-1 px-1">
          Press <kbd className="bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-[10px] font-mono">Enter</kbd> to send
        </p>
      </div>

      {/* Profile card */}
      {activeProfile && (
        <UserProfileCard
          member={activeProfile.member}
          anchorRect={activeProfile.anchorRect}
          onClose={() => setActiveProfile(null)}
        />
      )}
    </div>
  )
}

function DmMsgBtn({ children, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={clsx(
        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
        danger
          ? 'text-[#6B6E75] hover:bg-[#E53935]/10 hover:text-[#E53935]'
          : 'text-[#6B6E75] hover:bg-white/[0.08] hover:text-[#DBDEE1]'
      )}
    >
      {children}
    </button>
  )
}
