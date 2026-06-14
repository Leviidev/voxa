import { Router } from 'express'
import { createReadStream, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createRelease, getReleaseHistory } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/releases')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const ADMIN_SECRET = () => (process.env.JWT_SECRET || 'voxa_dev_secret_change_in_prod') + '_admin'

function requireAdminToken(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Admin token required' })
  try {
    const payload = jwt.verify(auth.slice(7), ADMIN_SECRET())
    if (!payload.admin) throw new Error('Not an admin token')
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' })
  }
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, _file, cb) => cb(null, 'windows_x64.exe'),
})

const upload = multer({
  storage,
  limits: { fileSize: 600 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.exe') || file.mimetype === 'application/octet-stream') {
      return cb(null, true)
    }
    cb(new Error('Only .exe files are accepted'))
  },
})

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(filePath)
      .on('data', d => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

const router = Router()

// ── Auth (no token required) ──────────────────────────────────────────────────
router.post('/auth', async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required' })

    const hash = process.env.ADMIN_PASSWORD_HASH
    if (!hash) return res.status(503).json({ error: 'Admin not configured' })

    const match = await bcrypt.compare(password, hash)
    if (!match) return res.status(401).json({ error: 'Incorrect password' })

    const token = jwt.sign({ admin: true }, ADMIN_SECRET(), { expiresIn: '8h' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(requireAdminToken)

router.get('/status', (_req, res) => {
  res.json({ admin: true })
})

router.get('/releases', async (_req, res) => {
  try {
    const history = await getReleaseHistory('windows', 20)
    res.json(history.map(r => ({
      id: r.id,
      platform: r.platform,
      filename: r.filename,
      sha256: r.sha256,
      sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
      version: r.version,
      notes: r.notes,
      uploadedAt: r.uploaded_at,
      uploaderName: r.uploader_name ?? null,
      url: `/releases/windows/windows_x64.exe`,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/releases/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const filePath = req.file.path
    const sha256 = await sha256File(filePath)
    const { version, notes } = req.body

    const release = await createRelease({
      platform: 'windows',
      filename: 'windows_x64.exe',
      sha256,
      sizeBytes: req.file.size,
      version: version?.trim() || null,
      notes: notes?.trim() || null,
      uploadedBy: null,
    })

    res.json({
      id: release.id,
      sha256,
      version: release.version,
      sizeBytes: req.file.size,
      url: `/releases/windows/windows_x64.exe`,
      uploadedAt: release.uploaded_at,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
