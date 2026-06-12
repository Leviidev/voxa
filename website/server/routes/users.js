import { Router } from 'express'
import { updateUser, getUserById, publicUserFull } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/users/me — full profile including email
router.get('/me', (req, res) => {
  const user = getUserById(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

// PATCH /api/users/me — update profile
router.patch('/me', (req, res) => {
  try {
    const { displayName, bio, customStatus, avatarUrl, avatarColor, bannerUrl, bannerColor, status } = req.body
    const updated = updateUser(req.user.id, { displayName, bio, customStatus, avatarUrl, avatarColor, bannerUrl, bannerColor, status })
    res.json(updated)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// GET /api/users/:id — public profile
router.get('/:id', (req, res) => {
  const user = getUserById(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

export default router
