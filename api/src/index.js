import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import serverRoutes from './routes/servers.js'
import channelRoutes from './routes/channels.js'
import messageRoutes from './routes/messages.js'
import userRoutes from './routes/users.js'

const app = express()
const PORT = process.env.API_PORT ?? 3001

app.use(cors({
  origin: [
    'http://localhost:5000',
    /\.replit\.dev$/,
    /\.replit\.app$/,
    process.env.SITE_URL,
  ].filter(Boolean),
  credentials: true,
}))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'voxa-api', version: '0.1.0', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/servers', serverRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, 'localhost', () => {
  console.log(`Voxa API listening on http://localhost:${PORT}`)
})
