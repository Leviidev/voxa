import { useState, useRef, useEffect, useCallback } from 'react'
import { Hash, Plus, Smile, Bell, Pin, Users, Search, Volume2, Trash2, Edit3, Check, X, WifiOff, MessageSquare, Pencil, Gamepad2, Flag } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../context/SocketContext.jsx'
import { useMessages } from '../hooks/useMessages.js'
import { useTyping } from '../hooks/useTyping.js'
import ThreadPanel from './ThreadPanel.jsx'
import PinnedMessagesPanel from './PinnedMessagesPanel.jsx'
import UserProfileCard from './UserProfileCard.jsx'
import { api } from '../lib/api.js'
import { useServers } from '../context/ServersContext.jsx'
import clsx from 'clsx'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '😮', '😢', '👀']

export default function ChatArea({ channel, server }) {
  const { user } = useAuth()
  const { connected, socket } = useSocket()
  const { refetch, updateMemberActivity } = useServers()
  const { messages, loading, addMessage, deleteMessage, editMessage, toggleReaction, setPinned } = useMessages(channel?.id)
  const { typers, onTyping, stopTyping } = useTyping(channel?.id, user)
  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [showPins, setShowPins] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [sendError, setSendError] = useState('')
  const [threadMsgId, setThreadMsgId] = useState(null)
  const [activeProfile, setActiveProfile] = useState(null)
  const [reportingMsg, setReportingMsg] = useState(null)
  const [topic, setTopic] = useState(channel?.topic ?? '')
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicInput, setTopicInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const prevChannelId = useRef(channel?.id)
  const isOwner = server?.ownerId === user?.id

  useEffect(() => { setTopic(channel?.topic ?? '') }, [channel?.id, channel?.topic])

  useEffect(() => {
    if (channel?.id !== prevChannelId.current) {
      setThreadMsgId(null)
      setShowPins(false)
    }
    prevChannelId.current = channel?.id
  }, [channel?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [channel?.id])

  useEffect(() => {
    if (!threadMsgId) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { inputRef.current?.focus() }, [channel?.id])

  useEffect(() => {
    if (!socket) return
    const handler = ({ userId, game }) => updateMemberActivity(userId, game)
    socket.on('activity:update', handler)
    return () => socket.off('activity:update', handler)
  }, [socket, updateMemberActivity])

  const sendMessage = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !user) return
    setInput('')
    setSendError('')
    stopTyping()
    try {
      await addMessage(text, user)
    } catch (err) {
      setSendError(err.message)
      setInput(text)
    }
  }

  const submitEdit = async (id) => {
    if (editVal.trim()) await editMessage(id, editVal.trim())
    setEditingId(null)
  }

  const openThread = (msgId) => {
    setThreadMsgId(prev => prev === msgId ? null : msgId)
    setShowMembers(false)
    setShowPins(false)
  }

  const toggleMembers = () => {
    setShowMembers(v => !v)
    setShowPins(false)
    setThreadMsgId(null)
  }

  const togglePins = () => {
    setShowPins(v => !v)
    setShowMembers(false)
    setThreadMsgId(null)
  }

  const handlePinMsg = async (msgId) => {
    try { await api.pinMessage(channel.id, msgId); setPinned?.(msgId, true) }
    catch (err) { console.error(err) }
  }

  const handleUnpinMsg = async (msgId) => {
    try { await api.unpinMessage(channel.id, msgId); setPinned?.(msgId, false) }
    catch (err) { console.error(err) }
  }

  const saveTopic = async () => {
    setEditingTopic(false)
    if (topicInput === topic) return
    try {
      await api.updateChannelTopic(channel.id, topicInput)
      setTopic(topicInput)
      refetch()
    } catch (_) { setTopic(channel?.topic ?? '') }
  }

  const openProfile = useCallback((member, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveProfile({ member, anchorRect: rect })
  }, [])

  if (channel?.type === 'voice') {
    return (
      <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center gap-4 text-[#949BA4]">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.06] flex items-center justify-center border border-white/[0.06]">
          <Volume2 size={32} className="text-[#6B6E75]" />
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-lg mb-1">{channel.name}</div>
          <p className="text-sm text-[#949BA4]">Voice Channel</p>
        </div>
        <button className="bg-[#23a55a] hover:bg-[#1e9150] text-white font-semibold px-8 py-2.5 rounded-full transition-colors text-sm">
          Join Voice Channel
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#313338] overflow-hidden">
      {/* Reconnecting banner */}
      {!connected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 shrink-0">
          <WifiOff size={13} className="text-amber-400 shrink-0" />
          <span className="text-amber-300 text-xs font-medium">Reconnecting… messages may be delayed</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="shrink-0 bg-[#313338] border-b border-white/[0.06]">
        <div className="h-12 px-4 flex items-center gap-2.5">
          <Hash size={18} className="text-[#6B6E75] shrink-0" />
          <span className="font-semibold text-white text-sm">{channel?.name ?? 'general'}</span>
          {topic && (
            <>
              <div className="w-px h-4 bg-white/[0.12] mx-1 hidden sm:block" />
              <span className="text-[#6B6E75] text-xs hidden sm:block truncate max-w-xs">{topic}</span>
            </>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            {connected && (
              <div className="flex items-center gap-1 mr-2" title="Live">
                <div className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                <span className="text-[10px] text-[#6B6E75] hidden sm:block">Live</span>
              </div>
            )}
            <TopBtn icon={Bell} label="Notifications" />
            <TopBtn icon={Pin} label="Pinned Messages" onClick={togglePins} active={showPins} />
            <TopBtn icon={Users} label="Members" onClick={toggleMembers} active={showMembers} />
            {isOwner && (
              <TopBtn icon={Pencil} label="Edit Topic" onClick={() => { setTopicInput(topic); setEditingTopic(true) }} />
            )}
            <div className="mx-1 bg-white/[0.06] border border-white/[0.08] rounded-lg flex items-center px-2 h-7 gap-1.5 cursor-text">
              <Search size={12} className="text-[#6B6E75]" />
              <span className="text-xs text-[#6B6E75] w-14 hidden sm:block">Search</span>
            </div>
          </div>
        </div>
        {editingTopic && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <input
              autoFocus
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTopic(); if (e.key === 'Escape') setEditingTopic(false) }}
              placeholder="Set a channel topic…"
              maxLength={500}
              className="flex-1 bg-[#1E1F22] border border-white/[0.08] text-[#DBDEE1] rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935]/50 placeholder:text-[#6B6E75]"
            />
            <button onClick={saveTopic} className="bg-[#E53935] text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#C62828] transition-colors">Save</button>
            <button onClick={() => setEditingTopic(false)} className="text-[#6B6E75] hover:text-[#949BA4] text-xs transition-colors">Cancel</button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages + Input column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollable px-4 py-4 flex flex-col gap-0.5">
            {loading && messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <ChannelWelcome channel={channel} topic={topic} />
            {messages.map((msg, i) => {
              const prev = messages[i - 1]
              const grouped = prev?.author === msg.author &&
                (new Date(msg.timestamp) - new Date(prev.timestamp)) < 1000 * 60 * 5
              return (
                <Message
                  key={msg.id}
                  msg={msg}
                  grouped={grouped}
                  currentUserId={user?.id}
                  isOwn={msg.authorId === user?.id || msg.author === user?.username}
                  isOwner={isOwner}
                  editing={editingId === msg.id}
                  editVal={editVal}
                  onEditVal={setEditVal}
                  onStartEdit={() => { setEditingId(msg.id); setEditVal(msg.content) }}
                  onSubmitEdit={() => submitEdit(msg.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => deleteMessage(msg.id)}
                  onReact={(emoji) => toggleReaction(msg.id, emoji)}
                  onOpenThread={() => openThread(msg.id)}
                  threadOpen={threadMsgId === msg.id}
                  onPin={() => msg.isPinned ? handleUnpinMsg(msg.id) : handlePinMsg(msg.id)}
                  onReport={() => setReportingMsg(msg)}
                  onAvatarClick={(e) => {
                    const member = server?.members?.find(m => m.id === msg.authorId)
                    if (member) openProfile(member, e)
                    else openProfile({ id: msg.authorId, username: msg.author, displayName: msg.displayName, avatarUrl: msg.avatarUrl, avatarColor: msg.avatarColor, status: 'offline' }, e)
                  }}
                />
              )
            })}
            <div ref={bottomRef} />
          </div>

          <TypingIndicator typers={typers} />

          {sendError && (
            <div className="px-5 pb-1">
              <p className="text-[#E53935] text-xs">{sendError}</p>
            </div>
          )}

          <div className="px-4 pb-4 shrink-0">
            <form onSubmit={sendMessage}
              className="bg-[#383A40] border border-white/[0.06] rounded-xl flex items-center gap-2 px-4 focus-within:border-white/[0.12] transition-all">
              <button type="button" className="text-[#6B6E75] hover:text-[#949BA4] py-3 shrink-0 transition-colors">
                <Plus size={18} />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); onTyping() }}
                onKeyDown={e => { if (e.key === 'Escape') { setInput(''); stopTyping() } }}
                placeholder={`Message #${channel?.name ?? 'general'}`}
                className="flex-1 bg-transparent text-[#DBDEE1] text-sm py-3 outline-none placeholder:text-[#6B6E75]"
                maxLength={2000}
              />
              <button type="button" className="text-[#6B6E75] hover:text-[#949BA4] transition-colors p-1">
                <Smile size={17} />
              </button>
            </form>
            <p className="text-[#6B6E75] text-xs mt-1 px-1">
              Press <kbd className="bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-[10px] font-mono">Enter</kbd> to send
            </p>
          </div>
        </div>

        {/* Right panels */}
        {threadMsgId && (
          <ThreadPanel key={threadMsgId} parentId={threadMsgId} channelName={channel?.name} onClose={() => setThreadMsgId(null)} />
        )}
        {showPins && !threadMsgId && channel && (
          <PinnedMessagesPanel channel={channel} currentUserId={user?.id} onClose={() => setShowPins(false)} onUnpin={(msgId) => setPinned?.(msgId, false)} />
        )}
        {showMembers && !threadMsgId && !showPins && server && (
          <MemberList members={server.members} onMemberClick={openProfile} />
        )}
      </div>

      {/* User profile card */}
      {activeProfile && (
        <UserProfileCard
          member={activeProfile.member}
          anchorRect={activeProfile.anchorRect}
          onClose={() => setActiveProfile(null)}
          serverId={server?.id}
        />
      )}

      {/* Report modal */}
      {reportingMsg && (
        <ReportModal
          msg={reportingMsg}
          onClose={() => setReportingMsg(null)}
        />
      )}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ typers }) {
  if (!typers.length) return <div className="h-5 shrink-0 px-5" />
  const names = typers.slice(0, 3).map(t => t.username)
  let label
  if (names.length === 1) label = `${names[0]} is typing`
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing`
  else label = `${names[0]}, ${names[1]} and others are typing`

  return (
    <div className="h-5 shrink-0 px-5 flex items-center gap-1.5">
      <span className="flex gap-0.5 items-end">
        {[0, 1, 2].map(i => (
          <span key={i}
            className="w-1 h-1 rounded-full bg-[#6B6E75] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </span>
      <span className="text-[11px] text-[#6B6E75]">
        <strong className="font-semibold text-[#949BA4]">{label}</strong>…
      </span>
    </div>
  )
}

// ── Top bar button ────────────────────────────────────────────────────────────
function TopBtn({ icon: Icon, label, onClick, active }) {
  return (
    <button title={label} onClick={onClick}
      className={clsx(
        'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
        active ? 'bg-white/[0.10] text-white' : 'text-[#6B6E75] hover:bg-white/[0.06] hover:text-[#DBDEE1]'
      )}>
      <Icon size={17} />
    </button>
  )
}

// ── Channel welcome banner ────────────────────────────────────────────────────
function ChannelWelcome({ channel, topic }) {
  return (
    <div className="mb-6 pb-4 border-b border-white/[0.06]">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center mb-3">
        <Hash size={22} className="text-[#6B6E75]" />
      </div>
      <h3 className="text-xl font-black text-white mb-1">Welcome to #{channel?.name ?? 'general'}</h3>
      {topic
        ? <p className="text-[#949BA4] text-sm">{topic}</p>
        : <p className="text-[#949BA4] text-sm">This is the start of the #{channel?.name ?? 'general'} channel.</p>}
    </div>
  )
}

// ── Reaction pills ────────────────────────────────────────────────────────────
function ReactionPills({ reactions, currentUserId, onReact }) {
  if (!reactions || !Object.keys(reactions).length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions).map(([emoji, { count, userIds }]) => {
        const reacted = userIds.includes(currentUserId)
        return (
          <button key={emoji} onClick={() => onReact(emoji)}
            title={`${count} reaction${count !== 1 ? 's' : ''}`}
            className={clsx(
              'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all',
              reacted
                ? 'bg-[#E53935]/20 border-[#E53935]/30 text-[#E53935]'
                : 'bg-white/[0.06] border-white/[0.08] text-[#949BA4] hover:bg-white/[0.10] hover:border-white/[0.12]'
            )}>
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Quick emoji picker ────────────────────────────────────────────────────────
function QuickReactPicker({ onReact, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute bottom-full right-0 mb-1 bg-[#2B2D31] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 flex gap-0.5 z-50">
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onReact(e); onClose() }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-white/[0.08] transition-colors">
          {e}
        </button>
      ))}
    </div>
  )
}

// ── Thread summary shown below a message ─────────────────────────────────────
function ThreadSummary({ replyCount, open, onClick }) {
  if (!replyCount) return null
  return (
    <button onClick={onClick}
      className={clsx(
        'mt-1 flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1 -mx-2 transition-colors',
        open ? 'bg-[#E53935]/10 text-[#E53935]' : 'text-[#949BA4] hover:bg-white/[0.06] hover:text-[#DBDEE1]'
      )}>
      <MessageSquare size={11} />
      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
    </button>
  )
}

// ── Message row ───────────────────────────────────────────────────────────────
function Message({ msg, grouped, currentUserId, isOwn, isOwner, editing, editVal, onEditVal,
  onStartEdit, onSubmitEdit, onCancelEdit, onDelete, onReact, onOpenThread, threadOpen, onPin, onReport, onAvatarClick }) {
  const [showPicker, setShowPicker] = useState(false)
  const color = msg.avatarColor || avatarColor(msg.author)
  const isOptimistic = msg.id?.startsWith('opt_')
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const reactions = (
    <ReactionPills reactions={msg.reactions} currentUserId={currentUserId} onReact={onReact} />
  )
  const threadSummary = (
    <ThreadSummary replyCount={msg.replyCount} open={threadOpen} onClick={onOpenThread} />
  )

  if (editing) {
    return (
      <div className="flex items-start gap-3 px-3 -mx-3 py-2 rounded-xl bg-[#E53935]/5 border border-[#E53935]/20 mt-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5"
          style={{ background: color }}>
          {msg.author?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-[#DBDEE1] text-sm">{msg.displayName ?? msg.author}</span>
            <span className="text-[#6B6E75] text-xs">{time}</span>
          </div>
          <input autoFocus value={editVal} onChange={e => onEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmitEdit(); if (e.key === 'Escape') onCancelEdit() }}
            className="w-full bg-[#1E1F22] border border-white/[0.08] text-[#DBDEE1] text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935]/50"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={onSubmitEdit} className="flex items-center gap-1 text-xs text-[#23a55a] hover:text-[#1e9150] font-medium transition-colors">
              <Check size={12} /> Save
            </button>
            <button onClick={onCancelEdit} className="flex items-center gap-1 text-xs text-[#6B6E75] hover:text-[#949BA4] transition-colors">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  const avatar = (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: msg.avatarUrl ? undefined : color }}
      onClick={onAvatarClick}>
      {msg.avatarUrl
        ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
        : msg.author?.[0]?.toUpperCase()}
    </div>
  )

  const nameLine = (
    <span
      className="font-semibold text-[#DBDEE1] text-sm cursor-pointer hover:underline"
      onClick={onAvatarClick}>
      {msg.displayName ?? msg.author}
    </span>
  )

  const pinBadge = msg.isPinned ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#6366F1] font-medium">
      <Pin size={9} /> pinned
    </span>
  ) : null

  if (grouped) return (
    <div className={clsx(
      'flex items-start gap-4 pl-12 group hover:bg-white/[0.02] rounded-xl px-3 -mx-3 py-0.5',
      isOptimistic && 'opacity-60',
      threadOpen && 'bg-[#E53935]/5',
    )}>
      <span className="text-[#6B6E75] text-[10px] w-9 text-right opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 font-mono">{time}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#DBDEE1] leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-[#6B6E75] text-[10px] ml-1">(edited)</span>}
        </p>
        {pinBadge}
        {reactions}
        {threadSummary}
      </div>
      {!isOptimistic && (
        <div className="relative">
          <MessageActions isOwn={isOwn} isOwner={isOwner} isPinned={msg.isPinned}
            onEdit={onStartEdit} onDelete={onDelete}
            onReactOpen={() => setShowPicker(v => !v)} onThread={onOpenThread} threadOpen={threadOpen}
            onPin={onPin} onReport={onReport} />
          {showPicker && <QuickReactPicker onReact={onReact} onClose={() => setShowPicker(false)} />}
        </div>
      )}
    </div>
  )

  return (
    <div className={clsx(
      'flex items-start gap-3 group hover:bg-white/[0.02] rounded-xl px-3 -mx-3 py-1.5 mt-2',
      isOptimistic && 'opacity-60',
      threadOpen && 'bg-[#E53935]/5',
    )}>
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          {nameLine}
          <span className="text-[#6B6E75] text-xs">{time}</span>
          {isOptimistic && <span className="text-[#6B6E75] text-[10px]">sending…</span>}
          {pinBadge}
        </div>
        <p className="text-sm text-[#DBDEE1] leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-[#6B6E75] text-[10px] ml-1">(edited)</span>}
        </p>
        {reactions}
        {threadSummary}
      </div>
      {!isOptimistic && (
        <div className="relative">
          <MessageActions isOwn={isOwn} isOwner={isOwner} isPinned={msg.isPinned}
            onEdit={onStartEdit} onDelete={onDelete}
            onReactOpen={() => setShowPicker(v => !v)} onThread={onOpenThread} threadOpen={threadOpen}
            onPin={onPin} onReport={onReport} />
          {showPicker && <QuickReactPicker onReact={onReact} onClose={() => setShowPicker(false)} />}
        </div>
      )}
    </div>
  )
}

// ── Action buttons row ────────────────────────────────────────────────────────
function MessageActions({ isOwn, isOwner, isPinned, onEdit, onDelete, onReactOpen, onThread, threadOpen, onPin, onReport }) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
      <ActionBtn onClick={onReactOpen} title="Add Reaction" className="text-base">😊</ActionBtn>
      <ActionBtn onClick={onThread} title="Open Thread" active={threadOpen}>
        <MessageSquare size={12} />
      </ActionBtn>
      {isOwner && (
        <ActionBtn onClick={onPin} title={isPinned ? 'Unpin' : 'Pin'} active={isPinned} activeColor="text-[#6366F1]">
          <Pin size={12} />
        </ActionBtn>
      )}
      {!isOwn && (
        <ActionBtn onClick={onReport} title="Report message" danger>
          <Flag size={12} />
        </ActionBtn>
      )}
      {isOwn && (
        <>
          <ActionBtn onClick={onEdit} title="Edit"><Edit3 size={12} /></ActionBtn>
          <ActionBtn onClick={onDelete} title="Delete" danger><Trash2 size={12} /></ActionBtn>
        </>
      )}
    </div>
  )
}

function ActionBtn({ children, title, onClick, active, activeColor, danger, className }) {
  return (
    <button title={title} onClick={onClick}
      className={clsx(
        'w-7 h-7 rounded-lg border flex items-center justify-center shadow-sm transition-colors',
        active && !danger && !activeColor ? 'bg-[#E53935]/10 border-[#E53935]/30 text-[#E53935]' :
        active && activeColor ? `bg-white/[0.06] border-white/[0.08] ${activeColor}` :
        danger ? 'bg-[#2B2D31] border-white/[0.08] text-[#6B6E75] hover:bg-[#E53935]/10 hover:text-[#E53935] hover:border-[#E53935]/30' :
        'bg-[#2B2D31] border-white/[0.08] text-[#6B6E75] hover:text-[#DBDEE1] hover:border-white/[0.12]',
        className
      )}>
      {children}
    </button>
  )
}

// ── Member list panel ─────────────────────────────────────────────────────────
function MemberList({ members, onMemberClick }) {
  const statusColor = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#6B6E75' }

  if (!members?.length) return (
    <div className="w-56 bg-[#2B2D31] border-l border-white/[0.06] py-4 shrink-0">
      <div className="px-4 text-[#6B6E75] text-[10px] font-bold uppercase tracking-wider mb-3">Members — 0</div>
    </div>
  )

  const online = members.filter(m => m.status !== 'offline')
  const offline = members.filter(m => m.status === 'offline')

  const roleGroups = {}
  const noRoleOnline = []

  for (const m of online) {
    const topRole = (m.roles ?? []).find(r => !r.isDefault && r.name !== '@everyone')
    if (topRole) {
      if (!roleGroups[topRole.id]) roleGroups[topRole.id] = { role: topRole, members: [] }
      roleGroups[topRole.id].members.push(m)
    } else {
      noRoleOnline.push(m)
    }
  }

  const sections = [
    ...Object.values(roleGroups).map(g => ({ label: g.role.name, color: g.role.color, members: g.members })),
    ...(noRoleOnline.length ? [{ label: `Online — ${noRoleOnline.length}`, color: null, members: noRoleOnline }] : []),
    ...(offline.length ? [{ label: `Offline — ${offline.length}`, color: null, members: offline }] : []),
  ]

  return (
    <div className="w-56 bg-[#2B2D31] border-l border-white/[0.06] overflow-y-auto scrollable py-3 shrink-0">
      {sections.map(section => (
        <div key={section.label} className="mb-4 px-3">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            {section.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: section.color }} />}
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6E75]">
              {section.label} {!section.label.includes('—') && `— ${section.members.length}`}
            </span>
          </div>
          {section.members.map(m => (
            <div key={m.id}
              onClick={e => onMemberClick(m, e)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs overflow-hidden"
                  style={{ background: m.avatarUrl ? undefined : (m.avatarColor || avatarColor(m.username)) }}>
                  {m.avatarUrl
                    ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : m.username?.[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31]"
                  style={{ background: statusColor[m.status] ?? '#6B6E75' }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#949BA4] hover:text-[#DBDEE1] truncate transition-colors">{m.displayName ?? m.username}</div>
                {m.gameActivity ? (
                  <div className="flex items-center gap-0.5 text-[10px] font-medium text-[#23a55a] truncate">
                    <Gamepad2 size={9} className="shrink-0" />
                    <span className="truncate">{m.gameActivity}</span>
                  </div>
                ) : m.roles?.length > 0 && m.roles.find(r => !r.isDefault && r.name !== '@everyone') ? (
                  <div className="text-[10px] font-medium truncate"
                    style={{ color: m.roles.find(r => !r.isDefault)?.color || '#E53935' }}>
                    {m.roles.find(r => !r.isDefault)?.name}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Report Modal ──────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  'Harassment or bullying',
  'Spam or scam',
  'Hate speech',
  'Inappropriate content',
  'Threats or violence',
  'Other',
]

function ReportModal({ msg, onClose }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await api.reportMessage(msg.id, reason)
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (_) {}
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-[#2B2D31] rounded-2xl shadow-2xl border border-white/[0.08] w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="font-black text-white text-base">Report Message</h2>
            <p className="text-[#6B6E75] text-xs mt-0.5">Help us understand what's wrong.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-[#6B6E75] hover:text-[#DBDEE1] transition-colors">
            <X size={14} />
          </button>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#23a55a]/10 border border-[#23a55a]/20 flex items-center justify-center mx-auto mb-3">
              <Check size={20} className="text-[#23a55a]" />
            </div>
            <p className="text-white font-bold">Thanks for reporting.</p>
            <p className="text-[#6B6E75] text-sm mt-1">Our team will review it shortly.</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="bg-[#1E1F22] rounded-xl p-3 mb-4 border border-white/[0.06]">
              <p className="text-[#6B6E75] text-[10px] font-bold uppercase tracking-wider mb-1">Message</p>
              <p className="text-[#949BA4] text-xs leading-relaxed line-clamp-2">{msg.content}</p>
            </div>
            <p className="text-[#949BA4] text-xs font-semibold mb-2">Why are you reporting this?</p>
            <div className="space-y-1.5 mb-4">
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border',
                    reason === r
                      ? 'bg-[#E53935]/10 border-[#E53935]/30 text-white'
                      : 'bg-white/[0.04] border-white/[0.06] text-[#949BA4] hover:bg-white/[0.08] hover:text-[#DBDEE1]'
                  )}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={submit} disabled={!reason || submitting}
              className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
