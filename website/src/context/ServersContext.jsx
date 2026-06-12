import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'
import { v4 as uuid } from '../utils/uuid.js'

const ServersContext = createContext(null)

export function ServersProvider({ children }) {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchServers = useCallback(async () => {
    const token = localStorage.getItem('voxa_token')
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getServers()
      setServers(data)
    } catch (_) {
      // API not reachable — stay empty (no mock data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const createServer = async (name) => {
    try {
      const server = await api.createServer(name)
      setServers(prev => [...prev, server])
      const firstTextChannel = server.categories
        .flatMap(c => c.channels)
        .find(c => c.type === 'text')
      return { server, channelId: firstTextChannel?.id }
    } catch {
      // Offline fallback
      const id = 'srv_' + uuid()
      const channelId = 'ch_' + uuid()
      const server = {
        id, name: name.trim(), icon: null, ownerId: 'local',
        categories: [
          { id: 'cat_' + uuid(), name: 'Text Channels', channels: [{ id: channelId, name: 'general', type: 'text' }] },
          { id: 'cat_' + uuid(), name: 'Voice Channels', channels: [{ id: 'vc_' + uuid(), name: 'General', type: 'voice' }] },
        ],
        members: [],
      }
      setServers(prev => [...prev, server])
      return { server, channelId }
    }
  }

  const createChannel = async (serverId, name, type = 'text') => {
    try {
      const ch = await api.createChannel(serverId, name, type)
      setServers(prev => prev.map(s => {
        if (s.id !== serverId) return s
        const cats = s.categories.map((c, i) => {
          if (i !== 0) return c
          return { ...c, channels: [...c.channels, ch] }
        })
        return { ...s, categories: cats }
      }))
      return ch.id
    } catch {
      const id = 'ch_' + uuid()
      setServers(prev => prev.map(s => {
        if (s.id !== serverId) return s
        const cats = s.categories.map((c, i) => {
          if (i !== 0) return c
          return { ...c, channels: [...c.channels, { id, name: name.trim().toLowerCase().replace(/\s+/g, '-'), type }] }
        })
        return { ...s, categories: cats }
      }))
      return id
    }
  }

  const deleteServer = async (serverId) => {
    setServers(prev => prev.filter(s => s.id !== serverId))
    try { await api.deleteServer(serverId) } catch (_) {}
  }

  return (
    <ServersContext.Provider value={{ servers, loading, createServer, createChannel, deleteServer, refetch: fetchServers }}>
      {children}
    </ServersContext.Provider>
  )
}

export const useServers = () => useContext(ServersContext)
