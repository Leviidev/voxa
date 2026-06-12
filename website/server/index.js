import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import serverRoutes from './routes/servers.js'
import channelRoutes from './routes/channels.js'
import messageRoutes from './routes/messages.js'

const app = express()
const PORT = process.env.API_PORT || 3001

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5000', 'https://voxa.lol'],
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/servers', serverRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)

// 404 for unmatched /api routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  next()
})

app.listen(PORT, () => {
  console.log(`Voxa API running on http://localhost:${PORT}`)
})
