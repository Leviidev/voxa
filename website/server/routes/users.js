import { Router } from 'express'
import { updateUser, getUserById, getNotificationPrefs, setNotificationPref } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/me', async (req, res) => {
  try {
    const user = await getUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.patch('/me', async (req, res) => {
  try {
    const { displayName, bio, customStatus, avatarUrl, avatarColor, bannerUrl, bannerColor, status, gameActivity } = req.body
    const updated = await updateUser(req.user.id, { displayName, bio, customStatus, avatarUrl, avatarColor, bannerUrl, bannerColor, status, gameActivity })
    if ('gameActivity' in req.body) {
      req.app.locals.io?.emit('activity:update', { userId: req.user.id, game: gameActivity ?? null })
    }
    res.json(updated)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/me/notifications', async (req, res) => {
  try {
    res.json(await getNotificationPrefs(req.user.id))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.patch('/me/notifications', async (req, res) => {
  try {
    const { serverId = null, channelId = null, muted = false, mentionsOnly = false } = req.body
    res.json(await setNotificationPref(req.user.id, { serverId, channelId, muted, mentionsOnly }))
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
