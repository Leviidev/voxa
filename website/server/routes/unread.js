import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getUnreadCounts } from '../db.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    res.json(await getUnreadCounts(req.user.id))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
