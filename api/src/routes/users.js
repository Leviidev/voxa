import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, discriminator: req.user.discriminator })
})

router.patch('/me', requireAuth, (req, res) => {
  const { username, status } = req.body
  res.json({ id: req.user.id, username: username ?? req.user.username, status: status ?? 'online' })
})

export default router
