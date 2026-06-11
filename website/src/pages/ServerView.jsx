import { useParams, Navigate } from 'react-router-dom'
import { MOCK_SERVERS } from '../data/mockData.js'
import ChatArea from '../components/ChatArea.jsx'
import { Hash } from 'lucide-react'

export default function ServerView() {
  const { serverId, channelId } = useParams()
  const server = MOCK_SERVERS.find(s => s.id === serverId)

  if (!server) return <Navigate to="/voxa/me" replace />

  const allChannels = server.categories.flatMap(c => c.channels)
  const channel = channelId
    ? allChannels.find(c => c.id === channelId)
    : allChannels.find(c => c.type === 'text')

  if (!channel) {
    return (
      <div className="flex-1 bg-voxa-chat flex flex-col items-center justify-center text-voxa-text-muted gap-3">
        <Hash size={48} className="opacity-20" />
        <p>No channel selected</p>
      </div>
    )
  }

  return <ChatArea channel={channel} server={server} />
}
