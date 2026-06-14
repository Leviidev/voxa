import { useEffect, useRef } from 'react'
import { X, Crown, Gamepad2 } from 'lucide-react'

const COLORS = ['#E53935', '#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']
const avatarColor = (name) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

const STATUS_LABEL = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' }
const STATUS_COLOR = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#96989D' }

export default function UserProfileCard({ member, anchorRect, onClose, serverId }) {
  const ref = useRef(null)

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
    const cardH = 320
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

  const color = member.avatarUrl ? undefined : (member.avatarColor || avatarColor(member.username))
  const nonDefaultRoles = (member.roles ?? []).filter(r => !r.isDefault && r.name !== '@everyone')
  const joinedDate = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const memberSince = member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null

  return (
    <div ref={ref} style={style}
      className="w-72 bg-white rounded-2xl shadow-2xl border border-[#E3E5E8] overflow-hidden select-none">

      {/* Banner */}
      <div className="h-16 relative" style={{ background: member.bannerColor || '#F2F3F5' }}>
        {member.bannerUrl && (
          <img src={member.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <button onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Avatar + status */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-8 mb-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center font-bold text-white text-xl overflow-hidden"
              style={{ background: color }}>
              {member.avatarUrl
                ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                : (member.displayName ?? member.username)?.[0]?.toUpperCase()}
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white"
              style={{ background: STATUS_COLOR[member.status] ?? '#96989D' }} />
          </div>
          {member.isOwner && (
            <div title="Server Owner" className="flex items-center gap-1 text-[#F59E0B] bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <Crown size={11} />
              <span className="text-[10px] font-bold">Owner</span>
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <div className="font-black text-[#1A1B1E] text-base leading-none">
            {member.displayName ?? member.username}
          </div>
          <div className="text-[#96989D] text-xs mt-0.5">
            @{member.username}#{member.discriminator ?? '0000'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: STATUS_COLOR[member.status] ?? '#96989D' }}>
            {STATUS_LABEL[member.status] ?? 'Offline'}
          </div>
        </div>

        {/* Game Activity */}
        {member.gameActivity && (
          <div className="mt-2 flex items-center gap-1.5 bg-[#F2F3F5] rounded-lg px-2.5 py-1.5">
            <Gamepad2 size={13} className="text-[#23a55a] shrink-0" />
            <span className="text-xs font-semibold text-[#3C3F44] truncate">
              Playing <span className="text-[#23a55a]">{member.gameActivity}</span>
            </span>
          </div>
        )}

        {/* Bio */}
        {member.bio && (
          <div className="mt-3 pt-3 border-t border-[#F2F3F5]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1">About me</div>
            <p className="text-xs text-[#5C6068] leading-relaxed line-clamp-3">{member.bio}</p>
          </div>
        )}

        {/* Dates */}
        <div className="mt-3 pt-3 border-t border-[#F2F3F5] space-y-1.5">
          {memberSince && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D]">Voxa Member Since</div>
              <div className="text-xs text-[#5C6068] mt-0.5">{memberSince}</div>
            </div>
          )}
          {joinedDate && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D]">Joined Server</div>
              <div className="text-xs text-[#5C6068] mt-0.5">{joinedDate}</div>
            </div>
          )}
        </div>

        {/* Roles */}
        {nonDefaultRoles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#F2F3F5]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#96989D] mb-1.5">
              Roles — {nonDefaultRoles.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {nonDefaultRoles.map(r => (
                <span key={r.id}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: (r.color ?? '#96989D') + '22', color: r.color ?? '#96989D', border: `1px solid ${(r.color ?? '#96989D')}44` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color ?? '#96989D' }} />
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
