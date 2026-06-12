import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { openDm, getDmChannels, getDmMessages, sendDmMessage, editDmMessage, deleteDmMessage, findUserByUsername, markDmRead } from '../db.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    res.json(await getDmChannels(req.user.id))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { userId, username } = req.body
    let targetId = userId
    if (!targetId && username) {
      const user = await findUserByUsername(username)
      if (!user) return res.status(404).json({ error: 'User not found' })
      targetId = user.id
    }
    if (!targetId) return res.status(400).json({ error: 'userId or username required' })
    const dm = await openDm(req.user.id, targetId)
    res.status(201).json(dm)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/:dmId/read', async (req, res) => {
  try {
    await markDmRead(req.user.id, req.params.dmId)
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/:dmId/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '50'), 100)
    res.json(await getDmMessages(req.params.dmId, req.user.id, limit))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/:dmId/messages', async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' })
    if (content.length > 2000) return res.status(400).json({ error: 'Message too long' })
    const msg = await sendDmMessage(req.params.dmId, req.user.id, content)
    res.status(201).json(msg)
    req.app.locals.io?.to(`dm:${req.params.dmId}`).emit('dm:message:new', msg)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.patch('/:dmId/messages/:msgId', async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' })
    const msg = await editDmMessage(req.params.msgId, req.user.id, content)
    res.json(msg)
    req.app.locals.io?.to(`dm:${req.params.dmId}`).emit('dm:message:edit', msg)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.delete('/:dmId/messages/:msgId', async (req, res) => {
  try {
    await deleteDmMessage(req.params.msgId, req.user.id)
    res.status(204).send()
    req.app.locals.io?.to(`dm:${req.params.dmId}`).emit('dm:message:delete', {
      id: req.params.msgId, dmChannelId: req.params.dmId,
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
