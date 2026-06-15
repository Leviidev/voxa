import { Router } from 'express'
import {
  createServer, getUserServers, deleteServer, getServerWithChannels, updateServer, leaveServer,
  kickMember, getRoles, createRole, updateRole, deleteRole, assignRole, removeRole,
  createInvite, getServerInvites, deleteInvite, discoverServers, joinPublicServer,
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Discovery (public, no auth required) ─────────────────────────────────────
router.get('/discover', async (req, res) => {
  try {
    const { q = '', category = '', limit = '50', offset = '0' } = req.query
    const servers = await discoverServers({ query: q, category, limit: parseInt(limit), offset: parseInt(offset) })
    res.json(servers)
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.use(requireAuth)

// ─── Servers ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try { res.json(await getUserServers(req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Server name is required' })
    res.status(201).json(await createServer({ name, ownerId: req.user.id }))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const server = await getServerWithChannels(req.params.id, req.user.id)
    if (!server) return res.status(404).json({ error: 'Server not found' })
    res.json(server)
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.patch('/:id', async (req, res) => {
  try { res.json(await updateServer(req.params.id, req.user.id, req.body)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try { await deleteServer(req.params.id, req.user.id); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/leave', async (req, res) => {
  try { await leaveServer(req.params.id, req.user.id); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/join-public', async (req, res) => {
  try { res.json(await joinPublicServer(req.params.id, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Members ──────────────────────────────────────────────────────────────────
router.delete('/:id/members/:userId', async (req, res) => {
  try { await kickMember(req.params.id, req.user.id, req.params.userId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Roles ────────────────────────────────────────────────────────────────────
router.get('/:id/roles', async (req, res) => {
  try { res.json(await getRoles(req.params.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/roles', async (req, res) => {
  try {
    const { name, color, hoist, permissions } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Role name is required' })
    res.status(201).json(await createRole(req.params.id, req.user.id, { name, color, hoist, permissions }))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.patch('/:id/roles/:roleId', async (req, res) => {
  try { res.json(await updateRole(req.params.id, req.user.id, req.params.roleId, req.body)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id/roles/:roleId', async (req, res) => {
  try { await deleteRole(req.params.id, req.user.id, req.params.roleId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.put('/:id/members/:userId/roles/:roleId', async (req, res) => {
  try { await assignRole(req.params.id, req.user.id, req.params.userId, req.params.roleId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id/members/:userId/roles/:roleId', async (req, res) => {
  try { await removeRole(req.params.id, req.user.id, req.params.userId, req.params.roleId); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Invites ──────────────────────────────────────────────────────────────────
router.get('/:id/invites', async (req, res) => {
  try { res.json(await getServerInvites(req.params.id, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.post('/:id/invites', async (req, res) => {
  try { res.status(201).json(await createInvite(req.params.id, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:id/invites/:code', async (req, res) => {
  try { await deleteInvite(req.params.code, req.user.id); res.status(204).send() }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

export default router
