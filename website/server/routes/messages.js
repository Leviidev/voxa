import { Router } from 'express'
import { getMessages, createMessage, editMessage, deleteMessage, toggleReaction, getThread, searchMessages } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '')
    cb(null, randomUUID().replace(/-/g, '') + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/(jpeg|jpg|png|gif|webp)|video\/mp4|application\/pdf|text\/plain)$/.test(file.mimetype)
    cb(null, ok)
  },
})

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

router.get('/channels/:channelId/search', async (req, res) => {
  try {
    const { q = '' } = req.query
    if (!q.trim()) return res.json([])
    res.json(await searchMessages(req.params.channelId, q))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/channels/:channelId/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided or unsupported type' })
    const url = `/uploads/${req.file.filename}`
    res.json({ url, name: req.file.originalname, type: req.file.mimetype })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/channels/:channelId/messages', async (req, res) => {
  try {
    const { content = '', attachmentUrl, attachmentName, attachmentType } = req.body
    if (!content?.trim() && !attachmentUrl)
      return res.status(400).json({ error: 'Message content or attachment is required' })
    if (content.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' })
    const msg = await createMessage({
      channelId: req.params.channelId,
      userId: req.user.id,
      content,
      attachmentUrl: attachmentUrl ?? null,
      attachmentName: attachmentName ?? null,
      attachmentType: attachmentType ?? null,
    })
    res.status(201).json(msg)
    req.app.locals.io?.to(`ch:${req.params.channelId}`).emit('message:new', msg)
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
    req.app.locals.io?.to(`ch:${msg.channelId}`).emit('message:edit', msg)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.delete('/:msgId', async (req, res) => {
  try {
    const { channelId } = await deleteMessage(req.params.msgId, req.user.id)
    res.status(204).send()
    req.app.locals.io?.to(`ch:${channelId}`).emit('message:delete', {
      id: req.params.msgId,
      channelId,
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/:msgId/reactions', async (req, res) => {
  try {
    const { emoji } = req.body
    if (!emoji) return res.status(400).json({ error: 'emoji required' })
    const result = await toggleReaction(req.params.msgId, req.user.id, emoji)
    res.json(result)
    req.app.locals.io?.to(`ch:${result.channelId}`).emit('reaction:update', result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/:msgId/thread', async (req, res) => {
  try {
    res.json(await getThread(req.params.msgId))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/:msgId/replies', async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' })
    if (content.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' })

    const thread = await getThread(req.params.msgId)
    const reply = await createMessage({
      channelId: thread.parent.channelId,
      userId: req.user.id,
      content,
      parentId: req.params.msgId,
    })

    const replyCount = thread.replies.length + 1
    res.status(201).json({ reply, replyCount })

    req.app.locals.io?.to(`ch:${reply.channelId}`).emit('thread:new', {
      reply,
      parentId: req.params.msgId,
      channelId: reply.channelId,
      replyCount,
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
