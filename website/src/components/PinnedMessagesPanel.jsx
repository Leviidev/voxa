import { useState, useEffect } from 'react'
import { X, Pin, Loader2, PinOff } from 'lucide-react'
import { api } from '../lib/api.js'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (n) => COLORS[(n?.charCodeAt(0) ?? 0) % COLORS.length]

export default function PinnedMessagesPanel({ channel, currentUserId, onClose, onUnpin }) {
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(true)
  const [unpinning, setUnpinning] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getPins(channel.id)
      .then(setPins)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channel.id])

  const handleUnpin = async (msgId) => {
    setUnpinning(msgId)
    try {
      await api.unpinMessage(channel.id, msgId)
      setPins(prev => prev.filter(p => p.id !== msgId))
      onUnpin?.(msgId)
    } catch (_) {}
    setUnpinning(null)
  }

  return (
    <div className="w-72 bg-[#2B2D31] border-l border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Pin size={15} className="text-[#6B6E75]" />
          <span className="font-semibold text-white text-sm">Pinned Messages</span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B6E75] hover:bg-white/[0.08] hover:text-[#DBDEE1] transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollable p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[#6B6E75]" />
          </div>
        ) : pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center">
              <Pin size={20} className="text-[#6B6E75]" />
            </div>
            <p className="text-white font-bold text-sm">No pinned messages</p>
            <p className="text-[#6B6E75] text-xs max-w-[200px] leading-relaxed">
              Pin important messages by hovering over them and clicking the pin icon.
            </p>
          </div>
        ) : (
          pins.map(msg => (
            <PinnedMessage
              key={msg.id}
              msg={msg}
              unpinning={unpinning === msg.id}
              onUnpin={() => handleUnpin(msg.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PinnedMessage({ msg, unpinning, onUnpin }) {
  const color = msg.avatarUrl ? undefined : (msg.avatarColor || avatarColor(msg.author))
  const time = new Date(msg.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 group relative hover:border-white/[0.10] transition-colors">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden"
          style={{ background: color }}>
          {msg.avatarUrl
            ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
            : msg.author?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-[#DBDEE1] text-xs truncate">{msg.displayName ?? msg.author}</span>
            <span className="text-[#6B6E75] text-[10px] shrink-0">{time}</span>
          </div>
          <p className="text-xs text-[#949BA4] mt-0.5 leading-relaxed line-clamp-4">{msg.content}</p>
          {msg.pinnedBy && (
            <p className="text-[10px] text-[#6B6E75] mt-1">Pinned by {msg.pinnedBy}</p>
          )}
        </div>
      </div>
      <button
        onClick={onUnpin}
        disabled={unpinning}
        title="Unpin message"
        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[#6B6E75] hover:bg-[#E53935]/10 hover:text-[#E53935] hover:border-[#E53935]/30 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
        <PinOff size={11} />
      </button>
    </div>
  )
}
