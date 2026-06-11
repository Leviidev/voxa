import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_SERVERS } from '../data/mockData.js'
import { v4 as uuid } from '../utils/uuid.js'

const ServersContext = createContext(null)

export function ServersProvider({ children }) {
  const [servers, setServers] = useState(() => {
    try {
      const s = localStorage.getItem('voxa_servers')
      return s ? JSON.parse(s) : MOCK_SERVERS
    } catch (_) { return MOCK_SERVERS }
  })

  const save = (next) => {
    setServers(next)
    try { localStorage.setItem('voxa_servers', JSON.stringify(next)) } catch (_) {}
  }

  const createServer = (name) => {
    const id = 'srv_' + uuid()
    const defaultChannelId = 'ch_' + uuid()
    const server = {
      id,
      name: name.trim(),
      icon: null,
      acronym: name.trim().slice(0, 2).toUpperCase(),
      color: `hsl(${Math.floor(Math.random() * 360)}, 60%, 45%)`,
      unread: false,
      categories: [
        {
          id: 'cat_' + uuid(),
          name: 'Text Channels',
          channels: [
            { id: defaultChannelId, name: 'general', type: 'text', unread: false },
          ]
        },
        {
          id: 'cat_' + uuid(),
          name: 'Voice Channels',
          channels: [
            { id: 'vc_' + uuid(), name: 'General', type: 'voice', unread: false, members: [] },
          ]
        }
      ],
      members: []
    }
    save([...servers, server])
    return { server, channelId: defaultChannelId }
  }

  const createChannel = (serverId, name, type = 'text') => {
    const id = 'ch_' + uuid()
    const next = servers.map(s => {
      if (s.id !== serverId) return s
      const cats = s.categories.map((c, i) => {
        if (i !== 0) return c
        return { ...c, channels: [...c.channels, { id, name: name.trim().toLowerCase().replace(/\s+/g, '-'), type, unread: false }] }
      })
      return { ...s, categories: cats }
    })
    save(next)
    return id
  }

  const deleteServer = (serverId) => {
    save(servers.filter(s => s.id !== serverId))
  }

  return (
    <ServersContext.Provider value={{ servers, createServer, createChannel, deleteServer }}>
      {children}
    </ServersContext.Provider>
  )
}

export const useServers = () => useContext(ServersContext)
