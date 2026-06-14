import { useEffect, useRef, useState } from 'react'
import { X, Crown, Gamepad2, Flag } from 'lucide-react'
import { api } from '../lib/api.js'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

const STATUS_LABEL = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' }
const STATUS_COLOR = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#6B6E75' }

export default function UserProfileCard({ member, anchorRect, onClose, serverId }) {
  const ref = useRef(null)
  const [reported, setReported] = useState(false)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Position the card near the anchor element
  const style = {}
  if (anchorRect) {
    const cardW = 280
    const cardH = 340
    const pad = 8
    let left = anchorRect.right + pad
    let top = anchorRect.top

    if (left + cardW > window.innerWidth - pad) left = anchorRect.left - cardW - pad
    if (left < pad) left = pad
    if (top + cardH > window.innerHeight - pad) top = window.innerHeight - cardH - pad
    if (top < pad) top = pad

    style.position = 'fixed'
    style.left = left
    style.top = top
    style.zIndex = 60
  }

  const handleReport = async () => {
    if (reported || !member?.id) return
    setReporting(true)
    try {
      await api.reportUser(member.id, 'Reported from profile card')
      setReported(true)
    } catch (_) {}
    setReporting(false)
  }

  const color = member.avatarUrl ? undefined : (member.avatarColor || avatarColor(member.username))
  const nonDefaultRoles = (member.roles ?? []).filter(r => !r.isDefault && r.name !== '@everyone')
  const joinedDate = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const memberSince = member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null

  return (
    <div ref={ref} style={style}
      className="w-72 bg-[#2B2D31] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden select-none">

      {/* Banner */}
      <div className="h-16 relative" style={{ background: member.bannerColor || '#1E1F22' }}>
        {member.bannerUrl && (
          <img src={member.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <button onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Avatar + status */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-8 mb-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-[#2B2D31] flex items-center justify-center font-bold text-white text-xl overflow-hidden"
              style={{ background: color }}>
              {member.avatarUrl
                ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                : (member.displayName ?? member.username)?.[0]?.toUpperCase()}
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[#2B2D31]"
              style={{ background: STATUS_COLOR[member.status] ?? '#6B6E75' }} />
          </div>
          {member.isOwner && (
            <div title="Server Owner" className="flex items-center gap-1 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
              <Crown size={11} />
              <span className="text-[10px] font-bold">Owner</span>
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <div className="font-black text-white text-base leading-none">
            {member.displayName ?? member.username}
          </div>
          <div className="text-[#6B6E75] text-xs mt-0.5">
            @{member.username}#{member.discriminator ?? '0000'}
          </div>
          <div className="text-xs mt-0.5 font-medium" style={{ color: STATUS_COLOR[member.status] ?? '#6B6E75' }}>
            {STATUS_LABEL[member.status] ?? 'Offline'}
          </div>
        </div>

        {/* Game Activity */}
        {member.gameActivity && (
          <div className="mt-2 flex items-center gap-1.5 bg-[#1E1F22] rounded-lg px-2.5 py-1.5">
            <Gamepad2 size={13} className="text-[#23a55a] shrink-0" />
            <span className="text-xs font-semibold text-[#DBDEE1] truncate">
              Playing <span className="text-[#23a55a]">{member.gameActivity}</span>
            </span>
          </div>
        )}

        {/* Bio */}
        {member.bio && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6E75] mb-1">About me</div>
            <p className="text-xs text-[#949BA4] leading-relaxed line-clamp-3">{member.bio}</p>
          </div>
        )}

        {/* Dates */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
          {memberSince && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6E75]">Voxa Member Since</div>
              <div className="text-xs text-[#949BA4] mt-0.5">{memberSince}</div>
            </div>
          )}
          {joinedDate && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6E75]">Joined Server</div>
              <div className="text-xs text-[#949BA4] mt-0.5">{joinedDate}</div>
            </div>
          )}
        </div>

        {/* Roles */}
        {nonDefaultRoles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6E75] mb-1.5">
              Roles — {nonDefaultRoles.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {nonDefaultRoles.map(r => (
                <span key={r.id}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: (r.color ?? '#6B6E75') + '22', color: r.color ?? '#949BA4', border: `1px solid ${(r.color ?? '#6B6E75')}44` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color ?? '#6B6E75' }} />
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Report user */}
        {member.id && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <button
              onClick={handleReport}
              disabled={reported || reporting}
              className={clsx(
                'flex items-center gap-1.5 text-[10px] font-medium transition-colors',
                reported ? 'text-[#6B6E75] cursor-default' : 'text-[#6B6E75] hover:text-[#E53935]'
              )}>
              <Flag size={11} />
              {reported ? 'Reported' : reporting ? 'Reporting…' : 'Report user'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function clsx(...args) {
  return args.filter(Boolean).join(' ')
}
