import { Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Plus, Compass, Download } from 'lucide-react'
import { MOCK_SERVERS } from '../data/mockData.js'
import clsx from 'clsx'

export default function ServerSidebar() {
  const { serverId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="w-[72px] bg-voxa-sidebar-dark flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto scrollable">
      {/* DM / Home button */}
      <ServerIcon
        label="Home"
        active={!serverId}
        onClick={() => navigate('/voxa/me')}
        pill
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-white font-black text-xl leading-none">v</span>
        </div>
      </ServerIcon>

      <Divider />

      {MOCK_SERVERS.map((srv) => (
        <ServerIcon
          key={srv.id}
          label={srv.name}
          active={serverId === srv.id}
          unread={srv.unread}
          onClick={() => navigate(`/voxa/servers/${srv.id}`)}
        >
          {srv.icon ? (
            <img src={srv.icon} alt={srv.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: srv.color }}>
              {srv.acronym}
            </div>
          )}
        </ServerIcon>
      ))}

      <Divider />

      {/* Add Server */}
      <ServerIcon label="Add a Server" onClick={() => {}}>
        <div className="w-full h-full flex items-center justify-center text-green-400">
          <Plus size={20} />
        </div>
      </ServerIcon>

      {/* Discover */}
      <ServerIcon label="Explore Public Servers" onClick={() => {}}>
        <div className="w-full h-full flex items-center justify-center text-green-400">
          <Compass size={20} />
        </div>
      </ServerIcon>

      <div className="flex-1" />

      {/* Download App */}
      <ServerIcon label="Download Voxa Apps" onClick={() => {}}>
        <div className="w-full h-full flex items-center justify-center text-voxa-text-muted">
          <Download size={16} />
        </div>
      </ServerIcon>
    </div>
  )
}

function ServerIcon({ children, label, active, unread, onClick, pill }) {
  return (
    <div className="relative group flex items-center" onClick={onClick}>
      {/* Active pill */}
      <div className={clsx(
        'absolute -left-3 w-1 rounded-r-full bg-voxa-header transition-all duration-150',
        active ? 'h-9' : unread ? 'h-2' : 'h-0 group-hover:h-4'
      )} />

      <div className={clsx(
        'w-12 h-12 cursor-pointer transition-all duration-150 overflow-hidden flex items-center justify-center',
        active ? 'rounded-2xl' : 'rounded-[50%] group-hover:rounded-2xl',
        active ? 'ring-2 ring-voxa-red' : '',
        pill ? 'bg-voxa-red' : 'bg-voxa-sidebar'
      )}>
        {children}
      </div>

      {/* Tooltip */}
      <div className="absolute left-16 bg-voxa-bg text-voxa-header text-xs font-semibold whitespace-nowrap px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-voxa-bg" />
      </div>
    </div>
  )
}

function Divider() {
  return <div className="w-8 h-px bg-white/10 my-1 shrink-0" />
}
