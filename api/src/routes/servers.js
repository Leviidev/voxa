import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { v4 as uuid } from 'uuid'

const router = Router()

const servers = new Map()

router.get('/', requireAuth, (req, res) => {
  const all = [...servers.values()].filter(s => s.memberIds.includes(req.user.id))
  res.json(all.map(({ memberIds: _, ...s }) => s))
})

router.post('/', requireAuth, (req, res) => {
  const { name, icon } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })
  const id = uuid()
  const server = {
    id, name, icon: icon ?? null,
    ownerId: req.user.id,
    memberIds: [req.user.id],
    createdAt: new Date().toISOString(),
  }
  servers.set(id, server)
  const { memberIds: _, ...safe } = server
  res.status(201).json(safe)
})

router.get('/:id', requireAuth, (req, res) => {
  const srv = servers.get(req.params.id)
  if (!srv) return res.status(404).json({ error: 'Server not found' })
  if (!srv.memberIds.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' })
  const { memberIds: _, ...safe } = srv
  res.json(safe)
})

router.delete('/:id', requireAuth, (req, res) => {
  const srv = servers.get(req.params.id)
  if (!srv) return res.status(404).json({ error: 'Server not found' })
  if (srv.ownerId !== req.user.id) return res.status(403).json({ error: 'Only the owner can delete a server' })
  servers.delete(req.params.id)
  res.status(204).end()
})

export default router
