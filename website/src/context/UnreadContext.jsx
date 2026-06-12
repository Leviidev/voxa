import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'
import { useSocket } from './SocketContext.jsx'
import { useAuth } from './AuthContext.jsx'

const UnreadContext = createContext(null)

export function UnreadProvider({ children }) {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [unread, setUnread] = useState({ channels: {}, dms: {} })
  const activeChannelRef = useRef(null)
  const activeDmRef = useRef(null)

  useEffect(() => {
    if (!user) { setUnread({ channels: {}, dms: {} }); return }
    api.getUnread().then(data => setUnread(data)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!socket || !user) return
    const onMsg = (msg) => {
      if (msg.channelId === activeChannelRef.current) return
      if (msg.authorId === user.id) return
      setUnread(prev => ({
        ...prev,
        channels: { ...prev.channels, [msg.channelId]: (prev.channels[msg.channelId] ?? 0) + 1 }
      }))
    }
    const onDmMsg = (msg) => {
      if (msg.dmChannelId === activeDmRef.current) return
      if (msg.authorId === user.id) return
      setUnread(prev => ({
        ...prev,
        dms: { ...prev.dms, [msg.dmChannelId]: (prev.dms[msg.dmChannelId] ?? 0) + 1 }
      }))
    }
    socket.on('message:new', onMsg)
    socket.on('dm:message:new', onDmMsg)
    return () => {
      socket.off('message:new', onMsg)
      socket.off('dm:message:new', onDmMsg)
    }
  }, [socket, user])

  const markChannelRead = useCallback(async (channelId) => {
    activeChannelRef.current = channelId
    setUnread(prev => ({ ...prev, channels: { ...prev.channels, [channelId]: 0 } }))
    try { await api.markChannelRead(channelId) } catch (_) {}
  }, [])

  const markDmRead = useCallback(async (dmId) => {
    activeDmRef.current = dmId
    setUnread(prev => ({ ...prev, dms: { ...prev.dms, [dmId]: 0 } }))
    try { await api.markDmRead(dmId) } catch (_) {}
  }, [])

  return (
    <UnreadContext.Provider value={{ unread, markChannelRead, markDmRead }}>
      {children}
    </UnreadContext.Provider>
  )
}

export const useUnread = () => useContext(UnreadContext)
