import { Router } from 'express'
import {
  createServer, getUserServers, deleteServer, getServerWithChannels, updateServer, leaveServer,
  kickMember, getRoles, createRole, updateRole, deleteRole, assignRole, removeRole,
  createInvite, getServerInvites, deleteInvite,
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ─── Servers ──────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try { res.json(getUserServers(req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/', (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Server name is required' })
    res.status(201).json(createServer({ name, ownerId: req.user.id }))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.get('/:id', (req, res) => {
  try {
    const server = getServerWithChannels(req.params.id, req.user.id)
    if (!server) return res.status(404).json({ error: 'Server not found' })
    res.json(server)
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.patch('/:id', (req, res) => {
  try { res.json(updateServer(req.params.id, req.user.id, req.body)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id', (req, res) => {
  try { deleteServer(req.params.id, req.user.id); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/leave', (req, res) => {
  try { leaveServer(req.params.id, req.user.id); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Members ──────────────────────────────────────────────────────────────────
router.delete('/:id/members/:userId', (req, res) => {
  try { kickMember(req.params.id, req.user.id, req.params.userId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Roles ────────────────────────────────────────────────────────────────────
router.get('/:id/roles', (req, res) => {
  try { res.json(getRoles(req.params.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/roles', (req, res) => {
  try {
    const { name, color, hoist, permissions } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Role name is required' })
    res.status(201).json(createRole(req.params.id, req.user.id, { name, color, hoist, permissions }))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.patch('/:id/roles/:roleId', (req, res) => {
  try { res.json(updateRole(req.params.id, req.user.id, req.params.roleId, req.body)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id/roles/:roleId', (req, res) => {
  try { deleteRole(req.params.id, req.user.id, req.params.roleId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.put('/:id/members/:userId/roles/:roleId', (req, res) => {
  try { assignRole(req.params.id, req.user.id, req.params.userId, req.params.roleId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id/members/:userId/roles/:roleId', (req, res) => {
  try { removeRole(req.params.id, req.user.id, req.params.userId, req.params.roleId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Invites ──────────────────────────────────────────────────────────────────
router.get('/:id/invites', (req, res) => {
  try { res.json(getServerInvites(req.params.id, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/invites', (req, res) => {
  try { res.status(201).json(createInvite(req.params.id, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id/invites/:code', (req, res) => {
  try { deleteInvite(req.params.code, req.user.id); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

export default router
