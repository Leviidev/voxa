import { Router } from 'express'
import { createUser, verifyUser, getUserById, getUserByEmail, getUserWithSecurity, createPasswordReset, usePasswordReset, createEmailVerification, useEmailVerification } from '../db.js'
import { signToken, signTempToken, requireAuth } from '../middleware/auth.js'
import { sendPasswordResetEmail, sendVerificationEmail } from '../email.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body
    if (!email || !username || !password) return res.status(400).json({ error: 'Email, username, and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    if (username.length < 2 || username.length > 32) return res.status(400).json({ error: 'Username must be 2–32 characters' })
    const user = await createUser({ email, username, password })
    const token = signToken({ id: user.id })
    // Send verification email (don't block response)
    createEmailVerification(user.id)
      .then(vToken => sendVerificationEmail(email, vToken))
      .catch(err => console.error('Verification email failed:', err.message))
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

    // Check if 2FA is required
    const secUser = await getUserWithSecurity(user.id)
    if (secUser?.totpEnabled) {
      const tempToken = signTempToken({ id: user.id })
      return res.json({ requires2FA: true, tempToken })
    }

    const token = signToken({ id: user.id })
    res.json({ token, user })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ─── Forgot password ──────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    // Always return success to avoid email enumeration
    res.json({ ok: true })
    const user = await getUserByEmail(email)
    if (!user) return
    const token = await createPasswordReset(user.id)
    await sendPasswordResetEmail(email, token)
  } catch (err) {
    console.error('Forgot password error:', err.message)
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    await usePasswordReset(token, password)
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ─── Email verification ───────────────────────────────────────────────────────

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'Token is required' })
    await useEmailVerification(token)
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' })
    const token = await createEmailVerification(req.user.id)
    await sendVerificationEmail(user.email, token)
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
