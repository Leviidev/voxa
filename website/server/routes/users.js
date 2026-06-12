import { Router } from 'express'
import { updateUser, getUserById } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/me', async (req, res) => {
  try {
    const user = await getUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.patch('/me', async (req, res) => {
  try {
    const { displayName, bio, customStatus, avatarUrl, avatarColor, bannerUrl, bannerColor, status } = req.body
    const updated = await updateUser(req.user.id, { displayName, bio, customStatus, avatarUrl, avatarColor, bannerUrl, bannerColor, status })
    res.json(updated)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
