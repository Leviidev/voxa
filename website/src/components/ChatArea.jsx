import { useState, useRef, useEffect, useCallback } from 'react'
import { Hash, Plus, Smile, Bell, Pin, Users, Search, Volume2, Trash2, Edit3, Check, X, WifiOff, MessageSquare, Pencil } from 'lucide-react'
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
  const { connected } = useSocket()
  const { refetch } = useServers()
  const { messages, loading, addMessage, deleteMessage, editMessage, toggleReaction, setPinned } = useMessages(channel?.id)
  const { typers, onTyping, stopTyping } = useTyping(channel?.id, user)
  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [showPins, setShowPins] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [sendError, setSendError] = useState('')
  const [threadMsgId, setThreadMsgId] = useState(null)
  const [activeProfile, setActiveProfile] = useState(null) // { member, anchorRect }
  const [topic, setTopic] = useState(channel?.topic ?? '')
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicInput, setTopicInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const prevChannelId = useRef(channel?.id)
  const isOwner = server?.ownerId === user?.id

  // Sync topic when channel changes
  useEffect(() => {
    setTopic(channel?.topic ?? '')
  }, [channel?.id, channel?.topic])

  // Close thread/pins when switching channels
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
    if (!threadMsgId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => { inputRef.current?.focus() }, [channel?.id])

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
    try {
      await api.pinMessage(channel.id, msgId)
      setPinned?.(msgId, true)
    } catch (err) { console.error(err) }
  }

  const handleUnpinMsg = async (msgId) => {
    try {
      await api.unpinMessage(channel.id, msgId)
      setPinned?.(msgId, false)
    } catch (err) { console.error(err) }
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
      {/* Reconnecting banner */}
      {!connected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <WifiOff size={13} className="text-amber-600 shrink-0" />
          <span className="text-amber-700 text-xs font-medium">Reconnecting… messages may be delayed</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="shrink-0 bg-white border-b border-[#E3E5E8]">
        <div className="h-12 px-4 flex items-center gap-2.5">
          <Hash size={18} className="text-[#96989D] shrink-0" />
          <span className="font-semibold text-[#1A1B1E] text-sm">{channel?.name ?? 'general'}</span>
          {topic && (
            <>
              <div className="w-px h-4 bg-[#E3E5E8] mx-1 hidden sm:block" />
              <span className="text-[#96989D] text-xs hidden sm:block truncate max-w-xs">{topic}</span>
            </>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            {connected && (
              <div className="flex items-center gap-1 mr-2" title="Live">
                <div className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                <span className="text-[10px] text-[#96989D] hidden sm:block">Live</span>
              </div>
            )}
            <TopBtn icon={Bell} label="Notifications" />
            <TopBtn icon={Pin} label="Pinned Messages" onClick={togglePins} active={showPins} />
            <TopBtn icon={Users} label="Members" onClick={toggleMembers} active={showMembers} />
            {isOwner && (
              <TopBtn icon={Pencil} label="Edit Topic" onClick={() => { setTopicInput(topic); setEditingTopic(true) }} />
            )}
            <div className="mx-1 bg-[#F2F3F5] border border-[#E3E5E8] rounded-lg flex items-center px-2 h-7 gap-1.5 cursor-text">
              <Search size={12} className="text-[#96989D]" />
              <span className="text-xs text-[#96989D] w-14 hidden sm:block">Search</span>
            </div>
          </div>
        </div>
        {/* Topic editor */}
        {editingTopic && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <input
              autoFocus
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTopic(); if (e.key === 'Escape') setEditingTopic(false) }}
              placeholder="Set a channel topic…"
              maxLength={500}
              className="flex-1 bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] placeholder:text-[#96989D]"
            />
            <button onClick={saveTopic} className="bg-[#E53935] text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#C62828] transition-colors">Save</button>
            <button onClick={() => setEditingTopic(false)} className="text-[#96989D] hover:text-[#5C6068] text-xs transition-colors">Cancel</button>
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
                  onAvatarClick={(e) => {
                    const member = server?.members?.find(m => m.id === msg.authorId)
                    if (member) openProfile(member, e)
                    else openProfile({ username: msg.author, displayName: msg.displayName, avatarUrl: msg.avatarUrl, avatarColor: msg.avatarColor, status: 'offline' }, e)
                  }}
                />
              )
            })}
            <div ref={bottomRef} />
          </div>

          <TypingIndicator typers={typers} />

          {sendError && (
            <div className="px-5 pb-1">
              <p className="text-red-500 text-xs">{sendError}</p>
            </div>
          )}

          <div className="px-4 pb-4 shrink-0">
            <form onSubmit={sendMessage}
              className="bg-[#F2F3F5] border border-[#E3E5E8] rounded-xl flex items-center gap-2 px-4 focus-within:ring-2 focus-within:ring-[#E53935]/20 focus-within:border-[#E53935]/40 transition-all">
              <button type="button" className="text-[#96989D] hover:text-[#5C6068] py-3 shrink-0 transition-colors">
                <Plus size={18} />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); onTyping() }}
                onKeyDown={e => { if (e.key === 'Escape') { setInput(''); stopTyping() } }}
                placeholder={`Message #${channel?.name ?? 'general'}`}
                className="flex-1 bg-transparent text-[#1A1B1E] text-sm py-3 outline-none placeholder:text-[#96989D]"
                maxLength={2000}
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

        {/* Right panels — thread > pins > members */}
        {threadMsgId && (
          <ThreadPanel
            key={threadMsgId}
            parentId={threadMsgId}
            channelName={channel?.name}
            onClose={() => setThreadMsgId(null)}
          />
        )}
        {showPins && !threadMsgId && channel && (
          <PinnedMessagesPanel
            channel={channel}
            currentUserId={user?.id}
            onClose={() => setShowPins(false)}
            onUnpin={(msgId) => setPinned?.(msgId, false)}
          />
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
            className="w-1 h-1 rounded-full bg-[#96989D] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </span>
      <span className="text-[11px] text-[#96989D]">
        <strong className="font-semibold text-[#5C6068]">{label}</strong>…
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
        active ? 'bg-[#E0E2E6] text-[#1A1B1E]' : 'text-[#96989D] hover:bg-[#F2F3F5] hover:text-[#5C6068]'
      )}>
      <Icon size={17} />
    </button>
  )
}

// ── Channel welcome banner ────────────────────────────────────────────────────
function ChannelWelcome({ channel, topic }) {
  return (
    <div className="mb-6 pb-4 border-b border-[#F2F3F5]">
      <div className="w-12 h-12 rounded-2xl bg-[#F2F3F5] border border-[#E3E5E8] flex items-center justify-center mb-3">
        <Hash size={22} className="text-[#96989D]" />
      </div>
      <h3 className="text-xl font-black text-[#1A1B1E] mb-1">Welcome to #{channel?.name ?? 'general'}</h3>
      {topic
        ? <p className="text-[#5C6068] text-sm">{topic}</p>
        : <p className="text-[#5C6068] text-sm">This is the start of the #{channel?.name ?? 'general'} channel.</p>}
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
                ? 'bg-[#E53935]/10 border-[#E53935]/30 text-[#E53935]'
                : 'bg-[#F2F3F5] border-[#E3E5E8] text-[#5C6068] hover:bg-[#EAEBEE] hover:border-[#D5D7DC]'
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
      className="absolute bottom-full right-0 mb-1 bg-white border border-[#E3E5E8] rounded-xl shadow-lg p-1.5 flex gap-0.5 z-50">
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onReact(e); onClose() }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-[#F2F3F5] transition-colors">
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
    <button
      onClick={onClick}
      className={clsx(
        'mt-1 flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1 -mx-2 transition-colors',
        open
          ? 'bg-[#E53935]/10 text-[#E53935]'
          : 'text-[#5C6068] hover:bg-[#F2F3F5] hover:text-[#1A1B1E]'
      )}
    >
      <MessageSquare size={11} />
      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
    </button>
  )
}

// ── Message row ───────────────────────────────────────────────────────────────
function Message({ msg, grouped, currentUserId, isOwn, isOwner, editing, editVal, onEditVal,
  onStartEdit, onSubmitEdit, onCancelEdit, onDelete, onReact, onOpenThread, threadOpen, onPin, onAvatarClick }) {
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
      <div className="flex items-start gap-3 px-3 -mx-3 py-2 rounded-xl bg-[#FFF5F5] border border-[#FECDD3] mt-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5"
          style={{ background: color }}>
          {msg.author?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-[#1A1B1E] text-sm">{msg.displayName ?? msg.author}</span>
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
      className="font-semibold text-[#1A1B1E] text-sm cursor-pointer hover:underline"
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
      'flex items-start gap-4 pl-12 group hover:bg-[#F7F8FA] rounded-xl px-3 -mx-3 py-0.5',
      isOptimistic && 'opacity-60',
      threadOpen && 'bg-[#FFF5F5]',
    )}>
      <span className="text-[#96989D] text-[10px] w-9 text-right opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 font-mono">{time}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#313439] leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-[#96989D] text-[10px] ml-1">(edited)</span>}
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
            onPin={onPin} />
          {showPicker && <QuickReactPicker onReact={onReact} onClose={() => setShowPicker(false)} />}
        </div>
      )}
    </div>
  )

  return (
    <div className={clsx(
      'flex items-start gap-3 group hover:bg-[#F7F8FA] rounded-xl px-3 -mx-3 py-1.5 mt-2',
      isOptimistic && 'opacity-60',
      threadOpen && 'bg-[#FFF5F5]',
    )}>
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          {nameLine}
          <span className="text-[#96989D] text-xs">{time}</span>
          {isOptimistic && <span className="text-[#96989D] text-[10px]">sending…</span>}
          {pinBadge}
        </div>
        <p className="text-sm text-[#313439] leading-relaxed">
          {msg.content}
          {msg.edited && <span className="text-[#96989D] text-[10px] ml-1">(edited)</span>}
        </p>
        {reactions}
        {threadSummary}
      </div>
      {!isOptimistic && (
        <div className="relative">
          <MessageActions isOwn={isOwn} isOwner={isOwner} isPinned={msg.isPinned}
            onEdit={onStartEdit} onDelete={onDelete}
            onReactOpen={() => setShowPicker(v => !v)} onThread={onOpenThread} threadOpen={threadOpen}
            onPin={onPin} />
          {showPicker && <QuickReactPicker onReact={onReact} onClose={() => setShowPicker(false)} />}
        </div>
      )}
    </div>
  )
}

// ── Action buttons row ────────────────────────────────────────────────────────
function MessageActions({ isOwn, isOwner, isPinned, onEdit, onDelete, onReactOpen, onThread, threadOpen, onPin }) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
      <button onClick={onReactOpen} title="Add Reaction"
        className="w-7 h-7 rounded-lg bg-white border border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] hover:border-[#D5D7DC] shadow-sm transition-colors text-base">
        😊
      </button>
      <button onClick={onThread} title="Open Thread"
        className={clsx(
          'w-7 h-7 rounded-lg border flex items-center justify-center shadow-sm transition-colors',
          threadOpen
            ? 'bg-[#E53935]/10 border-[#E53935]/30 text-[#E53935]'
            : 'bg-white border-[#E3E5E8] text-[#96989D] hover:text-[#5C6068] hover:border-[#D5D7DC]'
        )}>
        <MessageSquare size={12} />
      </button>
      {isOwner && (
        <button onClick={onPin} title={isPinned ? 'Unpin message' : 'Pin message'}
          className={clsx(
            'w-7 h-7 rounded-lg border flex items-center justify-center shadow-sm transition-colors',
            isPinned
              ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#6366F1]'
              : 'bg-white border-[#E3E5E8] text-[#96989D] hover:text-[#6366F1] hover:border-[#6366F1]/30'
          )}>
          <Pin size={12} />
        </button>
      )}
      {isOwn && (
        <>
          <button onClick={onEdit} title="Edit"
            className="w-7 h-7 rounded-lg bg-white border border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:text-[#5C6068] hover:border-[#D5D7DC] shadow-sm transition-colors">
            <Edit3 size={12} />
          </button>
          <button onClick={onDelete} title="Delete"
            className="w-7 h-7 rounded-lg bg-white border border-[#E3E5E8] flex items-center justify-center text-[#96989D] hover:text-[#E53935] hover:border-red-200 shadow-sm transition-colors">
            <Trash2 size={12} />
          </button>
        </>
      )}
    </div>
  )
}

// ── Member list panel ─────────────────────────────────────────────────────────
function MemberList({ members, onMemberClick }) {
  const statusColor = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#96989D' }

  if (!members?.length) return (
    <div className="w-56 bg-[#F7F8FA] border-l border-[#E3E5E8] py-4 shrink-0">
      <div className="px-4 text-[#96989D] text-[10px] font-bold uppercase tracking-wider mb-3">Members — 0</div>
    </div>
  )

  // Group by top non-default role first, then fallback to online/offline
  const online = members.filter(m => m.status !== 'offline')
  const offline = members.filter(m => m.status === 'offline')

  // Build role groups from online members
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
    ...Object.values(roleGroups).map(g => ({
      label: g.role.name,
      color: g.role.color,
      members: g.members,
    })),
    ...(noRoleOnline.length ? [{ label: `Online — ${noRoleOnline.length}`, color: null, members: noRoleOnline }] : []),
    ...(offline.length ? [{ label: `Offline — ${offline.length}`, color: null, members: offline }] : []),
  ]

  return (
    <div className="w-56 bg-[#F7F8FA] border-l border-[#E3E5E8] overflow-y-auto scrollable py-3 shrink-0">
      {sections.map(section => (
        <div key={section.label} className="mb-4 px-3">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            {section.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: section.color }} />}
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#96989D]">
              {section.label} {!section.label.includes('—') && `— ${section.members.length}`}
            </span>
          </div>
          {section.members.map(m => (
            <div key={m.id}
              onClick={e => onMemberClick(m, e)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#EAEBEE] cursor-pointer transition-colors">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs overflow-hidden"
                  style={{ background: m.avatarUrl ? undefined : (m.avatarColor || avatarColor(m.username)) }}>
                  {m.avatarUrl
                    ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : m.username?.[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F7F8FA]"
                  style={{ background: statusColor[m.status] ?? '#96989D' }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#5C6068] truncate">{m.displayName ?? m.username}</div>
                {m.roles?.length > 0 && m.roles.find(r => !r.isDefault && r.name !== '@everyone') && (
                  <div className="text-[10px] font-medium truncate"
                    style={{ color: m.roles.find(r => !r.isDefault)?.color || '#E53935' }}>
                    {m.roles.find(r => !r.isDefault)?.name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
