import { Router } from 'express'
import { createServer, getUserServers, deleteServer, getServerWithChannels } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/', (req, res) => {
  try {
    res.json(getUserServers(req.user.id))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Server name is required' })
    if (name.length > 100) return res.status(400).json({ error: 'Server name too long' })
    const server = createServer({ name, ownerId: req.user.id })
    res.status(201).json(server)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/:id', (req, res) => {
  try {
    const server = getServerWithChannels(req.params.id, req.user.id)
    if (!server) return res.status(404).json({ error: 'Server not found' })
    res.json(server)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.delete('/:id', (req, res) => {
  try {
    deleteServer(req.params.id, req.user.id)
    res.status(204).send()
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
