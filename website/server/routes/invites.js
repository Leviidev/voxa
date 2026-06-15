import { Router } from 'express'
import { useInvite, getInvitePreview } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/:code/preview', requireAuth, async (req, res) => {
  try {
    const preview = await getInvitePreview(req.params.code.toUpperCase(), req.user.id)
    res.json(preview)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/:code/join', requireAuth, async (req, res) => {
  try {
    const server = await useInvite(req.params.code.toUpperCase(), req.user.id)
    res.json(server)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
