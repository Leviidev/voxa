import { Router } from 'express'
import { createChannel, markChannelRead, getPinnedMessages, pinMessage, unpinMessage, updateChannelTopic } from '../db.js'
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

export default router
