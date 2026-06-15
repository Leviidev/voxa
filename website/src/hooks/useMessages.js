import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'
import { useSocket } from '../context/SocketContext.jsx'
import { useUnread } from '../context/UnreadContext.jsx'

export function useMessages(channelId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const { socket } = useSocket()
  const { markChannelRead } = useUnread()
  const channelIdRef = useRef(channelId)
  channelIdRef.current = channelId

  // ── Initial load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!channelId) return
    try {
      const cached = localStorage.getItem(`voxa_msgs_${channelId}`)
      if (cached) setMessages(JSON.parse(cached))
    } catch (_) {}

    setLoading(true)
    try {
      const msgs = await api.getMessages(channelId)
      setMessages(msgs)
      markChannelRead(channelId)
      try { localStorage.setItem(`voxa_msgs_${channelId}`, JSON.stringify(msgs)) } catch (_) {}
    } catch (_) {}
    finally { setLoading(false) }
  }, [channelId, markChannelRead])

  useEffect(() => {
    setMessages([])
    load()
  }, [load])

  // ── Socket: join/leave + live events ─────────────────────────────────────
  useEffect(() => {
    if (!socket || !channelId) return

    socket.emit('channel:join', channelId)

    const onNew = (msg) => {
      if (msg.channelId !== channelIdRef.current) return
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        const optimisticIdx = prev.findIndex(
          m => m.id.startsWith('opt_') && m.authorId === msg.authorId
        )
        const next = optimisticIdx >= 0
          ? prev.map((m, i) => i === optimisticIdx ? msg : m)
          : [...prev, msg]
        try { localStorage.setItem(`voxa_msgs_${msg.channelId}`, JSON.stringify(next)) } catch (_) {}
        return next
      })
    }

    const onEdit = (msg) => {
      if (msg.channelId !== channelIdRef.current) return
      setMessages(prev => {
        const next = prev.map(m => m.id === msg.id ? msg : m)
        try { localStorage.setItem(`voxa_msgs_${msg.channelId}`, JSON.stringify(next)) } catch (_) {}
        return next
      })
    }

    const onDelete = ({ id, channelId: cid }) => {
      if (cid !== channelIdRef.current) return
      setMessages(prev => {
        const next = prev.filter(m => m.id !== id)
        try { localStorage.setItem(`voxa_msgs_${cid}`, JSON.stringify(next)) } catch (_) {}
        return next
      })
    }

    const onReaction = ({ messageId, channelId: cid, reactions }) => {
      if (cid !== channelIdRef.current) return
      setMessages(prev => {
        const next = prev.map(m => m.id === messageId ? { ...m, reactions } : m)
        try { localStorage.setItem(`voxa_msgs_${cid}`, JSON.stringify(next)) } catch (_) {}
        return next
      })
    }

    const onThreadNew = ({ parentId, channelId: cid, replyCount }) => {
      if (cid !== channelIdRef.current) return
      setMessages(prev => prev.map(m => m.id === parentId ? { ...m, replyCount } : m))
    }

    socket.on('message:new', onNew)
    socket.on('message:edit', onEdit)
    socket.on('message:delete', onDelete)
    socket.on('reaction:update', onReaction)
    socket.on('thread:new', onThreadNew)

    return () => {
      socket.emit('channel:leave', channelId)
      socket.off('message:new', onNew)
      socket.off('message:edit', onEdit)
      socket.off('message:delete', onDelete)
      socket.off('reaction:update', onReaction)
      socket.off('thread:new', onThreadNew)
    }
  }, [socket, channelId])

  // ── Actions ───────────────────────────────────────────────────────────────
  const addMessage = async (content, user, attachment = null) => {
    const optimistic = {
      id: 'opt_' + Date.now(),
      author: user.username,
      authorId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      discriminator: user.discriminator,
      channelId,
      content,
      timestamp: new Date().toISOString(),
      edited: false,
      reactions: {},
      attachmentUrl: attachment?.attachmentUrl ?? null,
      attachmentName: attachment?.attachmentName ?? null,
      attachmentType: attachment?.attachmentType ?? null,
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const real = attachment
        ? await api.sendMessageWithAttachment(channelId, content, attachment)
        : await api.sendMessage(channelId, content)
      setMessages(prev => {
        const next = prev.map(m => m.id === optimistic.id ? real : m)
        try { localStorage.setItem(`voxa_msgs_${channelId}`, JSON.stringify(next)) } catch (_) {}
        return next
      })
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      throw err
    }
  }

  const deleteMessage = async (id) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    try { await api.deleteMessage(id) } catch (_) {}
  }

  const editMessage = async (id, content) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m))
    try {
      const updated = await api.editMessage(id, content)
      setMessages(prev => prev.map(m => m.id === id ? updated : m))
    } catch (_) {}
  }

  const toggleReaction = async (messageId, emoji) => {
    try { await api.toggleReaction(messageId, emoji) } catch (_) {}
  }

  const setPinned = (msgId, pinned) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: pinned } : m))
  }

  return { messages, loading, addMessage, deleteMessage, editMessage, toggleReaction, setPinned }
}
