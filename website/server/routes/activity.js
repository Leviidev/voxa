import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { updateGameActivity, getUserServers } from '../db.js'

const router = Router()
router.use(requireAuth)

router.patch('/me/activity', async (req, res) => {
  try {
    const { game } = req.body
    const gameValue = (typeof game === 'string' && game.trim()) ? game.trim().slice(0, 100) : null

    await updateGameActivity(req.user.id, gameValue)

    const io = req.app.locals.io
    if (io) {
      const servers = await getUserServers(req.user.id)
      for (const srv of servers) {
        io.to(`srv:${srv.id}`).emit('activity:update', {
          userId: req.user.id,
          game: gameValue,
        })
      }
    }

    res.json({ ok: true, game: gameValue })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
