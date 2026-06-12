import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useMessages(channelId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const localKey = `voxa_msgs_${channelId}`

  const load = useCallback(async () => {
    if (!channelId) return
    // Load cache immediately
    try {
      const cached = localStorage.getItem(localKey)
      if (cached) setMessages(JSON.parse(cached))
    } catch (_) {}

    setLoading(true)
    try {
      const msgs = await api.getMessages(channelId)
      setMessages(msgs)
      localStorage.setItem(localKey, JSON.stringify(msgs))
    } catch {
      // Keep cached messages if API fails
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => { load() }, [load])

  const save = (msgs) => {
    try { localStorage.setItem(localKey, JSON.stringify(msgs)) } catch (_) {}
  }

  const addMessage = async (content, user) => {
    // Optimistic
    const optimistic = {
      id: 'opt_' + Date.now(),
      author: user.username,
      authorId: user.id,
      discriminator: user.discriminator,
      content,
      timestamp: new Date().toISOString(),
      edited: false,
    }
    const next = [...messages, optimistic]
    setMessages(next)

    try {
      const real = await api.sendMessage(channelId, content)
      setMessages(prev => {
        const updated = prev.map(m => m.id === optimistic.id ? real : m)
        save(updated)
        return updated
      })
    } catch {
      save(next)
    }
  }

  const deleteMessage = async (id) => {
    setMessages(prev => {
      const next = prev.filter(m => m.id !== id)
      save(next)
      return next
    })
    try { await api.deleteMessage(id) } catch (_) {}
  }

  const editMessage = async (id, content) => {
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, content, edited: true } : m)
      save(next)
      return next
    })
    try {
      const updated = await api.editMessage(id, content)
      setMessages(prev => {
        const next = prev.map(m => m.id === id ? updated : m)
        save(next)
        return next
      })
    } catch (_) {}
  }

  return { messages, loading, addMessage, deleteMessage, editMessage }
}
