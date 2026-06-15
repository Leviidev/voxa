import { Router } from 'express'
import { createChannel, markChannelRead, getPinnedMessages, pinMessage, unpinMessage, updateChannelTopic, renameChannel, deleteChannel, getChannelOverwrites, setChannelOverwrite, deleteChannelOverwrite } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.post('/:channelId/read', async (req, res) => {
  try {
    await markChannelRead(req.user.id, req.params.channelId)
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/servers/:serverId/channels', async (req, res) => {
  try {
    const { name, type = 'text' } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Channel name is required' })
    if (!['text', 'voice'].includes(type)) return res.status(400).json({ error: 'Invalid channel type' })
    const channel = await createChannel({ serverId: req.params.serverId, name, type, userId: req.user.id })
    res.status(201).json(channel)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ─── Pins ──────────────────────────────────────────────────────────────────────
router.get('/:channelId/pins', async (req, res) => {
  try { res.json(await getPinnedMessages(req.params.channelId)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.put('/:channelId/pins/:msgId', async (req, res) => {
  try { res.json(await pinMessage(req.params.channelId, req.params.msgId, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:channelId/pins/:msgId', async (req, res) => {
  try { res.json(await unpinMessage(req.params.channelId, req.params.msgId, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Topic ─────────────────────────────────────────────────────────────────────
router.patch('/:channelId/topic', async (req, res) => {
  try { res.json(await updateChannelTopic(req.params.channelId, req.user.id, req.body.topic ?? '')) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Rename / Delete ───────────────────────────────────────────────────────────
router.patch('/:channelId', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Channel name is required' })
    res.json(await renameChannel(req.params.channelId, req.user.id, name.trim()))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:channelId', async (req, res) => {
  try { res.json(await deleteChannel(req.params.channelId, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Channel Permission Overwrites ─────────────────────────────────────────────
router.get('/:channelId/overwrites', async (req, res) => {
  try { res.json(await getChannelOverwrites(req.params.channelId)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.put('/:channelId/overwrites/:roleId', async (req, res) => {
  try {
    const { allow = [], deny = [] } = req.body
    res.json(await setChannelOverwrite(req.params.channelId, req.params.roleId, allow, deny, req.user.id))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

router.delete('/:channelId/overwrites/:roleId', async (req, res) => {
  try { res.json(await deleteChannelOverwrite(req.params.channelId, req.params.roleId, req.user.id)) }
  catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

export default router
