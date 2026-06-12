import { Router } from 'express'
import { getMessages, createMessage, editMessage, deleteMessage } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '50'), 100)
    res.json(await getMessages(req.params.channelId, limit))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/channels/:channelId/messages', async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' })
    if (content.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' })
    const msg = await createMessage({ channelId: req.params.channelId, userId: req.user.id, content })
    res.status(201).json(msg)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.patch('/:msgId', async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' })
    const msg = await editMessage(req.params.msgId, req.user.id, content)
    res.json(msg)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.delete('/:msgId', async (req, res) => {
  try {
    await deleteMessage(req.params.msgId, req.user.id)
    res.status(204).send()
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
