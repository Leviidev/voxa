import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { getSocket, disconnectSocket } from '../lib/socket.js'

const SocketContext = createContext(null)

export function SocketProvider({ children, user }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('voxa_token')
    if (!user || !token) {
      disconnectSocket()
      setSocket(null)
      setConnected(false)
      return
    }

    const s = getSocket(token)
    socketRef.current = s
    setSocket(s)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onConnectError = () => setConnected(false)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('connect_error', onConnectError)

    if (s.connected) setConnected(true)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('connect_error', onConnectError)
    }
  }, [user])

  // Disconnect on logout
  useEffect(() => {
    if (!user) {
      disconnectSocket()
      setSocket(null)
      setConnected(false)
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
