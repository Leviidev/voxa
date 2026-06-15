import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { api } from '../lib/api.js'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

export default function SearchPanel({ channelId, channelName, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.searchMessages(channelId, query)
        setResults(data)
      } catch (_) {}
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, channelId])

  return (
    <div className="w-72 bg-[#2B2D31] border-l border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
      <div className="h-12 px-3 flex items-center gap-2 border-b border-white/[0.06] shrink-0">
        <Search size={14} className="text-[#6B6E75] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search #${channelName}…`}
          className="flex-1 bg-transparent text-[#DBDEE1] text-sm outline-none placeholder:text-[#6B6E75]"
        />
        <button onClick={onClose} className="text-[#6B6E75] hover:text-[#DBDEE1] transition-colors shrink-0">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollable">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={18} className="text-[#6B6E75] animate-spin" />
          </div>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-[#6B6E75] text-sm">
              No messages for<br />
              <strong className="text-[#949BA4]">"{query}"</strong>
            </p>
          </div>
        )}
        {!loading && !query.trim() && (
          <div className="px-4 py-8 text-center">
            <Search size={24} className="text-[#6B6E75] mx-auto mb-2" />
            <p className="text-[#6B6E75] text-xs leading-relaxed">
              Search messages in<br />
              <strong className="text-[#949BA4]">#{channelName}</strong>
            </p>
          </div>
        )}
        {!loading && results.length > 0 && (
          <div className="py-2">
            <div className="px-3 pb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6E75]">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
            {results.map(msg => {
              const color = msg.avatarColor || avatarColor(msg.author)
              const time = new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
              return (
                <div key={msg.id} className="px-3 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0 overflow-hidden"
                      style={{ background: msg.avatarUrl ? undefined : color }}>
                      {msg.avatarUrl
                        ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : msg.author?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#DBDEE1] text-xs truncate flex-1">
                      {msg.displayName ?? msg.author}
                    </span>
                    <span className="text-[#6B6E75] text-[10px] shrink-0">{time}</span>
                  </div>
                  <p className="text-[#949BA4] text-xs leading-relaxed line-clamp-3">{msg.content}</p>
                  {msg.attachmentName && (
                    <div className="mt-1 text-[#6366F1] text-[10px] font-medium">
                      📎 {msg.attachmentName}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
