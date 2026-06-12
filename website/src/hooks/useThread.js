import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api.js'
import { useSocket } from '../context/SocketContext.jsx'

export function useThread(parentId) {
  const [parent, setParent] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)
  const { socket } = useSocket()
  const parentIdRef = useRef(parentId)
  parentIdRef.current = parentId

  const load = useCallback(async () => {
    if (!parentId) return
    setLoading(true)
    try {
      const data = await api.getThread(parentId)
      setParent(data.parent)
      setReplies(data.replies)
    } catch (_) {}
    finally { setLoading(false) }
  }, [parentId])

  useEffect(() => {
    setParent(null)
    setReplies([])
    load()
  }, [load])

  // Live: new replies broadcast on the channel socket room
  useEffect(() => {
    if (!socket || !parentId) return
    const onThreadNew = ({ reply, parentId: pid, replyCount }) => {
      if (pid !== parentIdRef.current) return
      setReplies(prev => prev.some(r => r.id === reply.id) ? prev : [...prev, reply])
      setParent(prev => prev ? { ...prev, replyCount } : prev)
    }
    socket.on('thread:new', onThreadNew)
    return () => socket.off('thread:new', onThreadNew)
  }, [socket, parentId])

  const addReply = async (content, user) => {
    const optimistic = {
      id: 'opt_' + Date.now(),
      author: user.username,
      authorId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      channelId: parent?.channelId,
      parentId,
      content,
      timestamp: new Date().toISOString(),
      edited: false,
      replyCount: 0,
      reactions: {},
    }
    setReplies(prev => [...prev, optimistic])
    try {
      const { reply, replyCount } = await api.postReply(parentId, content)
      setReplies(prev => prev.map(r => r.id === optimistic.id ? reply : r))
      setParent(prev => prev ? { ...prev, replyCount } : prev)
    } catch {
      setReplies(prev => prev.filter(r => r.id !== optimistic.id))
    }
  }

  return { parent, replies, loading, addReply }
}
