import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createReport, getReports } from '../db.js'

const router = Router()
router.use(requireAuth)

router.post('/', async (req, res) => {
  try {
    const { messageId, userId, reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required' })
    if (!messageId && !userId) return res.status(400).json({ error: 'messageId or userId required' })

    const report = await createReport({
      reporterId: req.user.id,
      messageId: messageId || null,
      userId: userId || null,
      reason: reason.trim().slice(0, 500),
    })
    res.json({ ok: true, id: report.id })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
