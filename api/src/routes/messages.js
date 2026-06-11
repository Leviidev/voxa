import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { v4 as uuid } from 'uuid'

const router = Router()
const messages = new Map()

router.get('/channels/:channelId/messages', requireAuth, (req, res) => {
  const { limit = 50, before } = req.query
  let msgs = [...messages.values()]
    .filter(m => m.channelId === req.params.channelId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  if (before) msgs = msgs.filter(m => new Date(m.createdAt) < new Date(before))
  res.json(msgs.slice(-Number(limit)))
})

router.post('/channels/:channelId/messages', requireAuth, (req, res) => {
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' })
  const id = uuid()
  const msg = {
    id,
    channelId: req.params.channelId,
    content: content.trim(),
    authorId: req.user.id,
    authorUsername: req.user.username,
    authorDiscriminator: req.user.discriminator,
    createdAt: new Date().toISOString(),
    edited: false,
  }
  messages.set(id, msg)
  res.status(201).json(msg)
})

router.patch('/:id', requireAuth, (req, res) => {
  const msg = messages.get(req.params.id)
  if (!msg) return res.status(404).json({ error: 'Message not found' })
  if (msg.authorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  msg.content = req.body.content ?? msg.content
  msg.edited = true
  msg.editedAt = new Date().toISOString()
  res.json(msg)
})

router.delete('/:id', requireAuth, (req, res) => {
  const msg = messages.get(req.params.id)
  if (!msg) return res.status(404).json({ error: 'Message not found' })
  if (msg.authorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  messages.delete(req.params.id)
  res.status(204).end()
})

export default router
