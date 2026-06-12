import { Router } from 'express'
import { useInvite } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.post('/:code/join', async (req, res) => {
  try {
    const server = await useInvite(req.params.code.toUpperCase(), req.user.id)
    res.json(server)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
