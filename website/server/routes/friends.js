import { Router } from 'express'
import {
  sendFriendRequest, getFriendRequests, acceptFriendRequest,
  declineFriendRequest, getFriends, removeFriend,
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.post('/request', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ error: 'Username required' })
    const result = await sendFriendRequest(req.user.id, username.trim())
    const io = req.app.locals.io
    if (io) io.to(`user:${result.toUserId}`).emit('friend:request', { fromUserId: req.user.id })
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/requests', async (req, res) => {
  try {
    const requests = await getFriendRequests(req.user.id)
    res.json(requests)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post('/requests/:id/accept', async (req, res) => {
  try {
    const result = await acceptFriendRequest(req.params.id, req.user.id)
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.delete('/requests/:id', async (req, res) => {
  try {
    const result = await declineFriendRequest(req.params.id, req.user.id)
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const friends = await getFriends(req.user.id)
    res.json(friends)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.delete('/:userId', async (req, res) => {
  try {
    const result = await removeFriend(req.user.id, req.params.userId)
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
