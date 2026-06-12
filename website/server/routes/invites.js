import { Router } from 'express'
import { useInvite } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// POST /api/invites/:code/join — join a server via invite code
router.post('/:code/join', (req, res) => {
  try {
    const server = useInvite(req.params.code.toUpperCase(), req.user.id)
    res.json(server)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
