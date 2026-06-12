import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import serverRoutes from './routes/servers.js'
import channelRoutes from './routes/channels.js'
import messageRoutes from './routes/messages.js'
import userRoutes from './routes/users.js'
import inviteRoutes from './routes/invites.js'

const app = express()
const PORT = process.env.API_PORT || 3001

// ─── Security: CORS ───────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean)
    const replitDomain = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ''
    const defaults = ['http://localhost:5000', 'http://localhost:5173', 'https://voxa.lol']
    if (replitDomain) defaults.push(replitDomain)
    // Also allow any *.replit.dev or *.repl.co domains
    const isReplitDomain = origin && (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co'))
    const ok = !origin || isReplitDomain || [...defaults, ...allowed].some(o => origin.startsWith(o))
    cb(ok ? null : new Error('CORS blocked'), ok)
  },
  credentials: true,
}))

app.use(express.json({ limit: '2mb' }))

// ─── Security: Rate Limiting ──────────────────────────────────────────────────

// Auth: very strict — 8 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API: 200 req / 5 min per IP
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Messages: 30 per minute per IP (anti-spam)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Sending messages too fast. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authLimiter)
app.use('/api/messages', messageLimiter)
app.use('/api', generalLimiter)

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/servers', serverRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/invites', inviteRoutes)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  next()
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' })
})

app.listen(PORT, () => console.log(`Voxa API running on http://localhost:${PORT}`))
