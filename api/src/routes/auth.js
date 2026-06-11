import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { signToken } from '../middleware/auth.js'

const router = Router()

const users = new Map()

router.post('/register', async (req, res) => {
  try {
    const { email, username, password, dob } = req.body
    if (!email || !username || !password) return res.status(400).json({ error: 'Missing required fields' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const existing = [...users.values()].find(u => u.email === email)
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const id = uuid()
    const hash = await bcrypt.hash(password, 12)
    const discriminator = String(Math.floor(1000 + Math.random() * 9000))
    const user = { id, email, username, discriminator, password: hash, dob, createdAt: new Date().toISOString(), avatar: null, status: 'online' }
    users.set(id, user)

    const token = signToken({ id, username, discriminator })
    const { password: _, ...safe } = user
    res.status(201).json({ token, user: safe })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = [...users.values()].find(u => u.email === email)
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' })

    const token = signToken({ id: user.id, username: user.username, discriminator: user.discriminator })
    const { password: _, ...safe } = user
    res.json({ token, user: safe })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
