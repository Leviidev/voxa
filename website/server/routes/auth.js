import { Router } from 'express'
import { createUser, verifyUser, getUserById } from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body
    if (!email || !username || !password) return res.status(400).json({ error: 'Email, username, and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    if (username.length < 2 || username.length > 32) return res.status(400).json({ error: 'Username must be 2–32 characters' })
    const user = await createUser({ email, username, password })
    const token = signToken({ id: user.id })
    res.status(201).json({ token, user })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const user = await verifyUser(email, password)
    const token = signToken({ id: user.id })
    res.json({ token, user })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

export default router
