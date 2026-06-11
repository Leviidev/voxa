import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useServers } from '../context/ServersContext.jsx'
import ChatArea from '../components/ChatArea.jsx'
import { Hash } from 'lucide-react'

export default function ServerView() {
  const { serverId, channelId } = useParams()
  const { servers } = useServers()
  const navigate = useNavigate()
  const server = servers.find(s => s.id === serverId)

  const allChannels = server?.categories.flatMap(c => c.channels) ?? []
  const channel = channelId
    ? allChannels.find(c => c.id === channelId)
    : null

  // Auto-navigate to first text channel if no channel selected
  useEffect(() => {
    if (server && !channelId) {
      const first = allChannels.find(c => c.type === 'text')
      if (first) navigate(`/voxa/servers/${serverId}/channels/${first.id}`, { replace: true })
    }
  }, [serverId, channelId, server])

  if (!server) return <Navigate to="/voxa/me" replace />

  if (!channel) {
    return (
      <div className="flex-1 bg-voxa-chat flex flex-col items-center justify-center text-voxa-text-muted gap-3">
        <Hash size={48} className="opacity-20" />
        <p className="text-sm">Select a channel to start chatting</p>
      </div>
    )
  }

  return <ChatArea channel={channel} server={server} />
}
