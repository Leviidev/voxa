import { Router } from 'express'
import { createReadStream, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { createRelease, getLatestRelease, getReleaseHistory } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/releases')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.length) return res.status(403).json({ error: 'No admins configured. Set ADMIN_EMAILS env var.' })
  if (!req.user?.email || !adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required.' })
  }
  next()
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
router.use(requireAuth)
router.use(requireAdmin)

router.get('/status', (req, res) => {
  res.json({ admin: true, email: req.user.email })
})

router.get('/releases', async (req, res) => {
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
      uploadedBy: req.user.id,
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
