import { Router } from 'express'
import { getLatestRelease, getReleaseFileData } from '../db.js'

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

const PLATFORM_MIME = {
  windows: 'application/octet-stream',
  ios: 'application/octet-stream',
  macos: 'application/x-apple-diskimage',
  linux: 'application/octet-stream',
  android: 'application/vnd.android.package-archive',
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
  return async (req, res) => {
    try {
      const fileData = await getReleaseFileData(platform)
      if (!fileData) return res.status(404).json({ error: 'No release file uploaded yet' })

      const displayName = PLATFORM_DISPLAY[platform]
      const mime = PLATFORM_MIME[platform]

      res.setHeader('Content-Type', mime)
      res.setHeader('Content-Disposition', `attachment; filename="${displayName}"`)
      res.setHeader('Content-Length', fileData.length)
      res.send(fileData)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}

for (const platform of Object.keys(PLATFORM_FILES)) {
  router.get(`/${platform}/latest`, makeLatestRoute(platform))
  router.get(`/${platform}/${PLATFORM_FILES[platform]}`, makeDownloadRoute(platform))
}

export default router
