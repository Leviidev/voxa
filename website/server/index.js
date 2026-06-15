import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '../dist')
import authRoutes from './routes/auth.js'
import securityRoutes from './routes/security.js'
import serverRoutes from './routes/servers.js'
import channelRoutes from './routes/channels.js'
import messageRoutes from './routes/messages.js'
import userRoutes from './routes/users.js'
import inviteRoutes from './routes/invites.js'
import dmRoutes from './routes/dms.js'
import unreadRoutes from './routes/unread.js'
import activityRoutes from './routes/activity.js'
import adminRoutes from './routes/admin.js'
import friendRoutes from './routes/friends.js'
import releasesRoutes from './routes/releases.js'
import githubRoutes from './routes/github.js'
import reportsRoutes from './routes/reports.js'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || process.env.API_PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'voxa_dev_secret_change_in_prod'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, cb) => {
    const allowed = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean)
    const replitDomain = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ''
    const defaults = ['http://localhost:5000', 'http://localhost:5173', 'https://voxa.lol']
    if (replitDomain) defaults.push(replitDomain)
    const isReplitDomain = origin && (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co'))
    const ok = !origin || isReplitDomain || [...defaults, ...allowed].some(o => origin.startsWith(o))
    cb(ok ? null : new Error('CORS blocked'), ok)
  },
  credentials: true,
}
app.set('trust proxy', 1)
app.use(cors(corsOptions))
app.use(express.json({ limit: '2mb' }))

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Auth middleware — verify JWT on every socket connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Unauthorized'))
  try {
    socket.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

// Track typing: channelId → Map<userId, {username, timer}>
const typingState = new Map()

io.on('connection', (socket) => {
  const { id: userId } = socket.user

  // ── Join / leave channel rooms ─────────────────────────────────────────────
  socket.on('channel:join', (channelId) => {
    socket.join(`ch:${channelId}`)
  })

  socket.on('channel:leave', (channelId) => {
    socket.leave(`ch:${channelId}`)
    clearTyping(channelId, userId, socket)
  })

  // ── Typing indicators ──────────────────────────────────────────────────────
  socket.on('typing:start', ({ channelId, username }) => {
    if (!channelId) return
    if (!typingState.has(channelId)) typingState.set(channelId, new Map())
    const channel = typingState.get(channelId)

    // Clear old auto-stop timer
    if (channel.has(userId)) clearTimeout(channel.get(userId).timer)

    const timer = setTimeout(() => {
      clearTyping(channelId, userId, socket)
    }, 4000)

    channel.set(userId, { username, timer })

    socket.to(`ch:${channelId}`).emit('typing:update', {
      channelId,
      userId,
      username,
      typing: true,
    })
  })

  socket.on('typing:stop', ({ channelId }) => {
    clearTyping(channelId, userId, socket)
  })

  // ── Presence ───────────────────────────────────────────────────────────────
  socket.on('presence:update', ({ serverId, status }) => {
    socket.to(`srv:${serverId}`).emit('presence:update', { userId, status })
  })

  socket.on('server:join', (serverId) => {
    socket.join(`srv:${serverId}`)
  })

  socket.on('dm:join', (dmId) => {
    socket.join(`dm:${dmId}`)
  })

  socket.on('dm:leave', (dmId) => {
    socket.leave(`dm:${dmId}`)
  })

  socket.on('disconnect', () => {
    // Clean up all typing indicators for this user
    for (const [channelId] of typingState) {
      clearTyping(channelId, userId, socket)
    }
  })
})

function clearTyping(channelId, userId, socket) {
  const channel = typingState.get(channelId)
  if (!channel) return
  const entry = channel.get(userId)
  if (entry) {
    clearTimeout(entry.timer)
    channel.delete(userId)
    socket.to(`ch:${channelId}`).emit('typing:update', {
      channelId,
      userId,
      typing: false,
    })
  }
}

// Expose io to route handlers
app.locals.io = io

// ─── Uploads (file attachments) ───────────────────────────────────────────────
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000, max: 8,
  message: { error: 'Too many auth attempts. Try again in 1 minute.' },
  standardHeaders: true, legacyHeaders: false,
})
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 200,
  message: { error: 'Too many requests. Slow down.' },
  standardHeaders: true, legacyHeaders: false,
})
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: 'Sending messages too fast. Slow down.' },
  standardHeaders: true, legacyHeaders: false,
})

app.use('/api/auth', authLimiter)
app.use('/api/messages', messageLimiter)
app.use('/api', generalLimiter)

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/auth', securityRoutes)
app.use('/api/users', userRoutes)
app.use('/api/users', activityRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/github', githubRoutes)
app.use('/api/releases', releasesRoutes)
app.use('/releases', releasesRoutes)
app.use('/api/servers', serverRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/dms', dmRoutes)
app.use('/api/unread', unreadRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/reports', reportsRoutes)

// ─── Static Frontend (production) ─────────────────────────────────────────────
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

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

httpServer.listen(PORT, () => console.log(`Voxa API + WebSocket running on http://localhost:${PORT}`))
