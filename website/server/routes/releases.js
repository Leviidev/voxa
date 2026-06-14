import { Router } from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { getLatestRelease } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/releases')

const router = Router()

const PLATFORM_FILES = {
  windows: 'windows_x64.exe',
  ios: 'voxa.ipa',
  macos: 'voxa.dmg',
  linux: 'voxa.AppImage',
  android: 'voxa.apk',
}

const PLATFORM_DISPLAY = {
  windows: 'Voxa-Setup.exe',
  ios: 'Voxa.ipa',
  macos: 'Voxa.dmg',
  linux: 'Voxa.AppImage',
  android: 'Voxa.apk',
}

function makeLatestRoute(platform) {
  return async (_req, res) => {
    try {
      const release = await getLatestRelease(platform)
      if (!release) return res.status(404).json({ error: 'No release available yet' })
      const base = process.env.APP_URL || 'https://voxa.lol'
      res.json({
        sha256: release.sha256,
        version: release.version,
        sizeBytes: release.size_bytes ? Number(release.size_bytes) : null,
        notes: release.notes,
        uploadedAt: release.uploaded_at,
        url: `${base}/releases/${platform}/${PLATFORM_FILES[platform]}`,
        platform,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}

function makeDownloadRoute(platform) {
  return (req, res) => {
    const filename = PLATFORM_FILES[platform]
    const filePath = join(UPLOADS_DIR, filename)
    if (!existsSync(filePath)) return res.status(404).json({ error: 'No release file uploaded yet' })
    res.download(filePath, PLATFORM_DISPLAY[platform])
  }
}

for (const platform of Object.keys(PLATFORM_FILES)) {
  router.get(`/${platform}/latest`, makeLatestRoute(platform))
  router.get(`/${platform}/${PLATFORM_FILES[platform]}`, makeDownloadRoute(platform))
}

export default router
