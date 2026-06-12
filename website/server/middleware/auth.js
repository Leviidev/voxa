import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'voxa_dev_secret_change_in_prod'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function signTempToken(payload) {
  return jwt.sign({ ...payload, _temp: true }, SECRET, { expiresIn: '5m' })
}

export function verifyTempToken(token) {
  const payload = jwt.verify(token, SECRET)
  if (!payload._temp) throw new Error('Not a temp token')
  return payload
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, SECRET)
    if (decoded._temp) return res.status(401).json({ error: 'Unauthorized' })
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
