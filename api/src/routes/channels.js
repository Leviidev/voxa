import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { v4 as uuid } from 'uuid'

const router = Router()
const channels = new Map()

router.get('/servers/:serverId/channels', requireAuth, (req, res) => {
  const chs = [...channels.values()].filter(c => c.serverId === req.params.serverId)
  res.json(chs)
})

router.post('/servers/:serverId/channels', requireAuth, (req, res) => {
  const { name, type = 'text' } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })
  const id = uuid()
  const ch = { id, serverId: req.params.serverId, name, type, createdAt: new Date().toISOString() }
  channels.set(id, ch)
  res.status(201).json(ch)
})

router.delete('/:id', requireAuth, (_req, res) => {
  res.status(204).end()
})

export default router
