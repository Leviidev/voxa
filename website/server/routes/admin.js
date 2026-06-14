import { Router } from 'express'
import { createReadStream, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createRelease, getReleaseHistory, getAdminStats } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/releases')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const ADMIN_SECRET = () => (process.env.JWT_SECRET || 'voxa_dev_secret_change_in_prod') + '_admin'

const PLATFORM_FILES = {
  windows: { filename: 'windows_x64.exe', exts: ['.exe'] },
  ios:     { filename: 'voxa.ipa',         exts: ['.ipa'] },
  macos:   { filename: 'voxa.dmg',         exts: ['.dmg', '.pkg'] },
  linux:   { filename: 'voxa.AppImage',    exts: ['.appimage', '.deb', '.tar.gz'] },
  android: { filename: 'voxa.apk',         exts: ['.apk', '.aab'] },
}

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
  filename: (req, file, cb) => {
    const platform = req.body?.platform || req.query?.platform || 'windows'
    const cfg = PLATFORM_FILES[platform] || PLATFORM_FILES.windows
    cb(null, cfg.filename)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 600 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const platform = req.body?.platform || req.query?.platform || 'windows'
    const cfg = PLATFORM_FILES[platform] || PLATFORM_FILES.windows
    const nameLower = file.originalname.toLowerCase()
    const allowed = cfg.exts.some(ext => nameLower.endsWith(ext))
    if (allowed || file.mimetype === 'application/octet-stream') return cb(null, true)
    cb(new Error(`File type not accepted for platform ${platform}`))
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

router.use(requireAdminToken)

router.get('/status', (_req, res) => res.json({ admin: true }))

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getAdminStats()
    res.json({
      totalUsers: stats.total_users,
      totalMessages: stats.total_messages,
      totalServers: stats.total_servers,
      activeGames: stats.active_games,
      newUsers24h: stats.new_users_24h,
      messages24h: stats.messages_24h,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/releases', async (req, res) => {
  try {
    const platform = req.query.platform || 'windows'
    const cfg = PLATFORM_FILES[platform] || PLATFORM_FILES.windows
    const history = await getReleaseHistory(platform, 20)
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
      url: `/releases/${platform}/${cfg.filename}`,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/releases/upload', upload.single('file'), async (req, res) => {
  let filePath = null
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const platform = req.body?.platform || 'windows'
    if (!PLATFORM_FILES[platform]) return res.status(400).json({ error: 'Invalid platform' })
    const cfg = PLATFORM_FILES[platform]

    filePath = req.file.path
    const sha256 = await sha256File(filePath)
    const { version, notes } = req.body

    // Read the file into a buffer so it can be stored in the database permanently
    const fileData = readFileSync(filePath)

    const release = await createRelease({
      platform,
      filename: cfg.filename,
      sha256,
      sizeBytes: req.file.size,
      version: version?.trim() || null,
      notes: notes?.trim() || null,
      uploadedBy: null,
      fileData,
    })

    // Clean up the temp file from disk — the DB is the source of truth now
    try { unlinkSync(filePath) } catch (_) {}
    filePath = null

    res.json({
      id: release.id,
      sha256,
      version: release.version,
      sizeBytes: req.file.size,
      url: `/releases/${platform}/${cfg.filename}`,
      uploadedAt: release.uploaded_at,
      platform,
    })
  } catch (err) {
    if (filePath) try { unlinkSync(filePath) } catch (_) {}
    res.status(500).json({ error: err.message })
  }
})

export default router
