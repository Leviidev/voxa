import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Compass, Download } from 'lucide-react'
import { useServers } from '../context/ServersContext.jsx'
import CreateServerModal from './CreateServerModal.jsx'
import clsx from 'clsx'

export default function ServerSidebar() {
  const { serverId } = useParams()
  const navigate = useNavigate()
  const { servers } = useServers()
  const [showCreate, setShowCreate] = useState(false)

  const handleServerClick = (srv) => {
    const firstTextChannel = srv.categories
      .flatMap(c => c.channels)
      .find(c => c.type === 'text')
    if (firstTextChannel) {
      navigate(`/voxa/servers/${srv.id}/channels/${firstTextChannel.id}`)
    } else {
      navigate(`/voxa/servers/${srv.id}`)
    }
  }

  return (
    <>
      <div className="w-[72px] bg-voxa-sidebar-dark flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto scrollable">
        {/* Home */}
        <ServerIcon
          label="Home"
          active={!serverId}
          onClick={() => navigate('/voxa/me')}
          pill
        >
          <span className="text-white font-black text-xl leading-none">v</span>
        </ServerIcon>

        <Divider />

        {servers.map((srv) => (
          <ServerIcon
            key={srv.id}
            label={srv.name}
            active={serverId === srv.id}
            unread={srv.unread}
            onClick={() => handleServerClick(srv)}
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

        <ServerIcon label="Add a Server" onClick={() => setShowCreate(true)}>
          <Plus size={20} className="text-green-400" />
        </ServerIcon>

        <ServerIcon label="Explore Public Servers" onClick={() => {}}>
          <Compass size={20} className="text-green-400" />
        </ServerIcon>

        <div className="flex-1" />

        <ServerIcon label="Download Voxa Apps" onClick={() => {}}>
          <Download size={16} className="text-voxa-text-muted" />
        </ServerIcon>
      </div>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </>
  )
}

function ServerIcon({ children, label, active, unread, onClick, pill }) {
  return (
    <div className="relative group flex items-center cursor-pointer" onClick={onClick}>
      <div className={clsx(
        'absolute -left-3 w-1 rounded-r-full bg-voxa-header transition-all duration-150',
        active ? 'h-9' : unread ? 'h-2' : 'h-0 group-hover:h-4'
      )} />
      <div className={clsx(
        'w-12 h-12 transition-all duration-150 overflow-hidden flex items-center justify-center select-none',
        active ? 'rounded-2xl' : 'rounded-[50%] group-hover:rounded-2xl',
        active && !pill ? 'ring-2 ring-voxa-red' : '',
        pill ? 'bg-voxa-red rounded-2xl' : 'bg-voxa-sidebar'
      )}>
        {children}
      </div>
      <div className="absolute left-16 bg-[#111214] text-voxa-header text-xs font-semibold whitespace-nowrap px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
      </div>
    </div>
  )
}

function Divider() {
  return <div className="w-8 h-px bg-white/10 my-1 shrink-0" />
}
