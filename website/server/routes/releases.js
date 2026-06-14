import { Router } from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { getLatestRelease } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/releases')

const router = Router()

router.get('/windows/latest', async (_req, res) => {
  try {
    const release = await getLatestRelease('windows')
    if (!release) return res.status(404).json({ error: 'No release available yet' })
    res.json({
      sha256: release.sha256,
      version: release.version,
      sizeBytes: release.size_bytes ? Number(release.size_bytes) : null,
      notes: release.notes,
      uploadedAt: release.uploaded_at,
      url: `${process.env.APP_URL || 'https://voxa.lol'}/releases/windows/windows_x64.exe`,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/windows/windows_x64.exe', (req, res) => {
  const filePath = join(UPLOADS_DIR, 'windows_x64.exe')
  if (!existsSync(filePath)) return res.status(404).json({ error: 'No release file uploaded yet' })
  res.download(filePath, 'Voxa-Setup.exe')
})

export default router
