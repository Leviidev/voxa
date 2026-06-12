import { Router } from 'express'
import { createChannel } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.post('/servers/:serverId/channels', (req, res) => {
  try {
    const { name, type = 'text' } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Channel name is required' })
    if (!['text', 'voice'].includes(type)) return res.status(400).json({ error: 'Invalid channel type' })
    const channel = createChannel({ serverId: req.params.serverId, name, type, userId: req.user.id })
    res.status(201).json(channel)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
