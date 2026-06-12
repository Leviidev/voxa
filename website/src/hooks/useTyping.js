import { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '../context/SocketContext.jsx'

export function useTyping(channelId, currentUser) {
  const { socket } = useSocket()
  const [typers, setTypers] = useState([])
  const stopTimerRef = useRef(null)
  const isTypingRef = useRef(false)

  // Listen for typing events from server
  useEffect(() => {
    if (!socket || !channelId) return

    const onUpdate = ({ channelId: cid, userId, username, typing }) => {
      if (cid !== channelId) return
      if (userId === currentUser?.id) return

      setTypers(prev => {
        if (typing) {
          if (prev.some(t => t.userId === userId)) return prev
          return [...prev, { userId, username }]
        }
        return prev.filter(t => t.userId !== userId)
      })
    }

    socket.on('typing:update', onUpdate)
    return () => socket.off('typing:update', onUpdate)
  }, [socket, channelId, currentUser?.id])

  // Clear typers when channel changes
  useEffect(() => { setTypers([]) }, [channelId])

  const onTyping = useCallback(() => {
    if (!socket || !channelId || !currentUser) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit('typing:start', { channelId, username: currentUser.displayName ?? currentUser.username })
    }

    clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket.emit('typing:stop', { channelId })
    }, 2500)
  }, [socket, channelId, currentUser])

  const stopTyping = useCallback(() => {
    if (!socket || !channelId) return
    clearTimeout(stopTimerRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      socket.emit('typing:stop', { channelId })
    }
  }, [socket, channelId])

  useEffect(() => () => clearTimeout(stopTimerRef.current), [])

  return { typers, onTyping, stopTyping }
}
