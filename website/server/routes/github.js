import { Router } from 'express'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'
import jwt from 'jsonwebtoken'
import { createRelease } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/releases')
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const ADMIN_SECRET = () => (process.env.JWT_SECRET || 'voxa_dev_secret_change_in_prod') + '_admin'

const PLATFORM_FILES = {
  windows: { filename: 'windows_x64.exe' },
  ios:     { filename: 'voxa.ipa' },
  macos:   { filename: 'voxa.dmg' },
  linux:   { filename: 'voxa.AppImage' },
  android: { filename: 'voxa.apk' },
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

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'voxa-admin/1.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getRepo() {
  const repo = process.env.GITHUB_REPO
  if (!repo) throw new Error('GITHUB_REPO env var not set (format: owner/repo)')
  return repo
}

async function ghFetch(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: ghHeaders() })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

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
router.use(requireAdminToken)

// GET /api/admin/github/config — check if GitHub is configured
router.get('/config', (_req, res) => {
  res.json({
    configured: !!process.env.GITHUB_REPO,
    repo: process.env.GITHUB_REPO || null,
    hasToken: !!process.env.GITHUB_TOKEN,
  })
})

// GET /api/admin/github/runs — last 10 runs across all workflows
router.get('/runs', async (_req, res) => {
  try {
    const repo = getRepo()
    const data = await ghFetch(`/repos/${repo}/actions/runs?per_page=20&exclude_pull_requests=true`)
    const runs = (data.workflow_runs || []).slice(0, 10).map(r => ({
      id: r.id,
      name: r.name,
      workflowName: r.name,
      displayTitle: r.display_title || r.head_commit?.message?.split('\n')[0] || r.name,
      status: r.status,
      conclusion: r.conclusion,
      branch: r.head_branch,
      sha: r.head_sha?.slice(0, 7),
      runNumber: r.run_number,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      htmlUrl: r.html_url,
    }))
    res.json(runs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/github/runs/:runId/artifacts — artifacts for a run
router.get('/runs/:runId/artifacts', async (req, res) => {
  try {
    const repo = getRepo()
    const data = await ghFetch(`/repos/${repo}/actions/runs/${req.params.runId}/artifacts`)
    const artifacts = (data.artifacts || []).map(a => ({
      id: a.id,
      name: a.name,
      sizeInBytes: a.size_in_bytes,
      createdAt: a.created_at,
      expiresAt: a.expires_at,
      expired: a.expired,
    }))
    res.json(artifacts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/github/import — download artifact zip & publish as release
router.post('/import', async (req, res) => {
  const { artifactId, platform, version, notes } = req.body
  if (!artifactId || !platform) return res.status(400).json({ error: 'artifactId and platform are required' })
  if (!PLATFORM_FILES[platform]) return res.status(400).json({ error: 'Invalid platform' })
  if (!process.env.GITHUB_TOKEN) return res.status(400).json({ error: 'GITHUB_TOKEN not configured — required to download artifacts' })

  const repo = getRepo()
  const cfg = PLATFORM_FILES[platform]
  const destPath = join(UPLOADS_DIR, cfg.filename)
  const tmpZip = join(UPLOADS_DIR, `_tmp_artifact_${artifactId}.zip`)

  try {
    // Step 1: Get the redirect URL for the artifact zip
    const zipRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/artifacts/${artifactId}/zip`,
      { headers: ghHeaders(), redirect: 'manual' }
    )

    let downloadUrl
    if (zipRes.status === 302 || zipRes.status === 301) {
      downloadUrl = zipRes.headers.get('location')
    } else if (zipRes.ok) {
      downloadUrl = zipRes.url
    } else {
      const body = await zipRes.text().catch(() => '')
      throw new Error(`GitHub artifact download failed (${zipRes.status}): ${body.slice(0, 200)}`)
    }

    // Step 2: Download the zip to a temp file
    const dlRes = await fetch(downloadUrl)
    if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`)

    const writer = createWriteStream(tmpZip)
    await pipeline(dlRes.body, writer)

    // Step 3: Extract the relevant file from the zip
    // Use unzip system command — always available on Linux/macOS
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    // List zip contents first
    const { stdout: listOut } = await execFileAsync('unzip', ['-l', tmpZip]).catch(() => ({ stdout: '' }))
    const lines = listOut.split('\n').filter(l => l.trim())
    const fileEntry = lines.find(l => {
      const lower = l.toLowerCase()
      return lower.includes('.ipa') || lower.includes('.exe') || lower.includes('.dmg') ||
        lower.includes('.appimage') || lower.includes('.apk') || lower.includes('.aab') ||
        lower.includes('.pkg') || lower.includes('.deb')
    })

    let innerFile = null
    if (fileEntry) {
      const match = fileEntry.match(/\s(\S+\.\w+)$/)
      if (match) innerFile = match[1]
    }

    if (innerFile) {
      await execFileAsync('unzip', ['-o', tmpZip, innerFile, '-d', UPLOADS_DIR])
      // Move to canonical filename if different
      const extractedPath = join(UPLOADS_DIR, innerFile.split('/').pop())
      if (extractedPath !== destPath) {
        const { rename } = await import('fs/promises')
        await rename(extractedPath, destPath).catch(async () => {
          // If rename fails across devices, copy+delete
          const { copyFile } = await import('fs/promises')
          await copyFile(extractedPath, destPath)
          await unlink(extractedPath)
        })
      }
    } else {
      // No recognizable file found — extract everything and use the largest file
      await execFileAsync('unzip', ['-o', tmpZip, '-d', join(UPLOADS_DIR, '_extract_tmp')])
      const { readdir, stat } = await import('fs/promises')
      const tmpExtract = join(UPLOADS_DIR, '_extract_tmp')
      const files = await readdir(tmpExtract)
      let biggest = null, biggestSize = 0
      for (const f of files) {
        const s = await stat(join(tmpExtract, f))
        if (s.isFile() && s.size > biggestSize) { biggestSize = s.size; biggest = f }
      }
      if (!biggest) throw new Error('No files found in artifact zip')
      const { copyFile, rm } = await import('fs/promises')
      await copyFile(join(tmpExtract, biggest), destPath)
      await rm(tmpExtract, { recursive: true, force: true })
    }

    // Step 4: Compute sha256 and record release
    const sha256 = await sha256File(destPath)
    const { stat } = await import('fs/promises')
    const { size } = await stat(destPath)

    const release = await createRelease({
      platform,
      filename: cfg.filename,
      sha256,
      sizeBytes: size,
      version: version?.trim() || null,
      notes: notes?.trim() || `Imported from GitHub Actions artifact #${artifactId}`,
      uploadedBy: null,
    })

    res.json({
      id: release.id,
      sha256,
      version: release.version,
      sizeBytes: size,
      url: `/releases/${platform}/${cfg.filename}`,
      uploadedAt: release.uploaded_at,
      platform,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    unlink(tmpZip).catch(() => {})
  }
})

export default router
