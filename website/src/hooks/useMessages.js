import { useState, useEffect } from 'react'
import { MOCK_MESSAGES } from '../data/mockData.js'

export function useMessages(channelId) {
  const key = `voxa_msgs_${channelId}`

  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return JSON.parse(stored)
    } catch (_) {}
    return MOCK_MESSAGES[channelId] ?? []
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) setMessages(JSON.parse(stored))
      else setMessages(MOCK_MESSAGES[channelId] ?? [])
    } catch (_) {
      setMessages(MOCK_MESSAGES[channelId] ?? [])
    }
  }, [channelId])

  const addMessage = (msg) => {
    setMessages(prev => {
      const next = [...prev, msg]
      try { localStorage.setItem(key, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }

  const deleteMessage = (id) => {
    setMessages(prev => {
      const next = prev.filter(m => m.id !== id)
      try { localStorage.setItem(key, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }

  const editMessage = (id, content) => {
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, content, edited: true } : m)
      try { localStorage.setItem(key, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }

  return { messages, addMessage, deleteMessage, editMessage }
}
