const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, Notification } = require('electron')
const { exec } = require('child_process')
const { createHash } = require('crypto')
const path = require('path')
const https = require('https')
const http = require('http')
const fs = require('fs')
const os = require('os')

// ── Config ────────────────────────────────────────────────────────────────────
const VOXA_URL = process.env.VOXA_URL || 'https://voxa.lol'
const API_BASE = process.env.API_URL || 'https://voxa.lol'
const POLL_INTERVAL = 10_000
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000

// ── Game Database (macOS process names) ───────────────────────────────────────
const GAMES = [
  // Battle Royale
  { name: 'Fortnite',                  exe: 'fortnite' },
  { name: 'Apex Legends',             exe: 'r5apex' },
  { name: 'PUBG',                     exe: 'tslgame' },
  // FPS
  { name: 'CS2',                      exe: 'cs2' },
  { name: 'CS:GO',                    exe: 'csgo_osx64' },
  { name: 'Valorant',                 exe: 'valorant' },
  { name: 'Overwatch 2',              exe: 'overwatch' },
  { name: 'Destiny 2',                exe: 'destiny2' },
  // MOBAs
  { name: 'League of Legends',        exe: 'leagueoflegen' },
  { name: 'Dota 2',                   exe: 'dota2' },
  // Sports
  { name: 'Rocket League',            exe: 'rocketleague' },
  // Survival / Sandbox
  { name: 'Minecraft: Java Edition',  exe: 'java', cmdContains: 'minecraft' },
  { name: 'Valheim',                  exe: 'valheim.x86_64' },
  { name: 'Terraria',                 exe: 'terraria' },
  { name: 'Subnautica',               exe: 'subnautica' },
  // Social / Party
  { name: 'Among Us',                 exe: 'among us' },
  { name: 'Roblox',                   exe: 'robloxplayer' },
  // RPG / Action
  { name: 'GTA V',                    exe: 'gta5' },
  { name: 'The Witcher 3',            exe: 'witcher3' },
  { name: 'Hollow Knight',            exe: 'hollow knight' },
  { name: 'Stardew Valley',           exe: 'stardewvalley' },
  { name: 'Hades',                    exe: 'hades' },
  { name: 'Hades II',                 exe: 'hades2' },
  { name: 'Baldur\'s Gate 3',         exe: 'bg3' },
  { name: 'Path of Exile',            exe: 'pathofexile' },
  { name: 'Palworld',                 exe: 'palworld' },
  // Platformer
  { name: 'Celeste',                  exe: 'celeste' },
  { name: 'Cuphead',                  exe: 'cuphead' },
  // Strategy
  { name: 'StarCraft II',             exe: 'sc2' },
  { name: 'Civilization VI',          exe: 'civvi' },
  // Simulation
  { name: 'The Sims 4',               exe: 'thesims4' },
  // Fighting
  { name: 'Street Fighter 6',         exe: 'sf6' },
]

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null
let tray = null
let authToken = null
let currentGame = null
let pollTimer = null
let updateReady = false
let pendingDmgPath = null
let pendingVersion = null

// ── Custom Updater ────────────────────────────────────────────────────────────

function getUpdateStatePath() {
  return path.join(app.getPath('userData'), 'voxa-update-state.json')
}

function loadUpdateState() {
  try {
    const raw = fs.readFileSync(getUpdateStatePath(), 'utf8')
    return JSON.parse(raw)
  } catch {
    return { installedSha256: null }
  }
}

function saveUpdateState(state) {
  try {
    fs.writeFileSync(getUpdateStatePath(), JSON.stringify(state), 'utf8')
  } catch (_) {}
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, { timeout: 15000 }, (res) => {
      let data = ''
      res.on('data', d => { data += d })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Invalid JSON response')) }
      })
    }).on('error', reject).on('timeout', () => reject(new Error('Request timed out')))
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)
    let downloaded = 0
    let total = 0

    lib.get(url, { timeout: 0 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlink(destPath, () => {})
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      total = parseInt(res.headers['content-length'] || '0', 10)
      res.on('data', chunk => {
        downloaded += chunk.length
        if (total && onProgress) onProgress(Math.round((downloaded / total) * 100))
      })
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', err => { fs.unlink(destPath, () => {}); reject(err) })
    }).on('error', err => { fs.unlink(destPath, () => {}); reject(err) })
  })
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    fs.createReadStream(filePath)
      .on('data', d => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

async function checkForUpdates() {
  if (!app.isPackaged) return

  try {
    const info = await fetchJson(`${API_BASE}/api/releases/macos/latest`)
    if (!info?.sha256) return

    const state = loadUpdateState()

    if (!state.installedSha256) {
      saveUpdateState({ installedSha256: info.sha256 })
      return
    }

    if (info.sha256 === state.installedSha256) return

    console.log('[updater] New version detected, downloading…')
    showNotification('Voxa Update Available', 'Downloading update in the background…')
    updateTray()

    const tmpPath = path.join(os.tmpdir(), `voxa-update-${Date.now()}.dmg`)
    await downloadFile(info.url, tmpPath, (pct) => {
      if (pct % 25 === 0) console.log(`[updater] Download ${pct}%`)
    })

    const downloadedSha256 = await sha256File(tmpPath)
    if (downloadedSha256 !== info.sha256) {
      fs.unlink(tmpPath, () => {})
      console.error('[updater] SHA-256 mismatch — update aborted')
      return
    }

    pendingDmgPath = tmpPath
    pendingVersion = info.version || null
    updateReady = true
    updateTray()
    showNotification(
      'Voxa Update Ready',
      `${pendingVersion ? `v${pendingVersion} ` : ''}is ready to install.`
    )
  } catch (err) {
    console.error('[updater] Check failed:', err.message)
  }
}

function applyUpdate() {
  if (!pendingDmgPath || !fs.existsSync(pendingDmgPath)) return

  dialog.showMessageBox({
    type: 'info',
    title: 'Install Update',
    message: `Voxa ${pendingVersion ? `v${pendingVersion} ` : ''}is ready to install.`,
    detail: 'The DMG will open so you can drag Voxa to your Applications folder.',
    buttons: ['Open Installer', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response !== 0) return
    exec(`open "${pendingDmgPath}"`)
  })
}

function setupAutoUpdater() {
  if (!app.isPackaged) return
  const check = () => checkForUpdates().catch(() => {})
  setTimeout(check, 8_000)
  setInterval(check, UPDATE_CHECK_INTERVAL)
}

// ── Notification helper ────────────────────────────────────────────────────────
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}

// ── Game Detection ────────────────────────────────────────────────────────────
function getRunningProcesses() {
  return new Promise((resolve) => {
    exec('ps -eo comm=', { timeout: 8000 }, (err, stdout) => {
      if (err) return resolve([])
      resolve(stdout.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean))
    })
  })
}

function detectGame(procs) {
  const procSet = new Set(procs)
  for (const game of GAMES) {
    if (procSet.has(game.exe.toLowerCase())) return game.name
  }
  return null
}

async function reportActivity(game) {
  if (!authToken) return
  const body = JSON.stringify({ game })
  const urlParsed = new URL(`${API_BASE}/api/users/me/activity`)
  const isHttps = urlParsed.protocol === 'https:'
  const lib = isHttps ? https : http
  return new Promise((resolve) => {
    const req = lib.request({
      hostname: urlParsed.hostname,
      port: urlParsed.port || (isHttps ? 443 : 80),
      path: urlParsed.pathname,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => { res.resume(); resolve() })
    req.on('error', resolve)
    req.write(body)
    req.end()
  })
}

async function pollGames() {
  try {
    const procs = await getRunningProcesses()
    const detected = detectGame(procs)
    if (detected !== currentGame) {
      currentGame = detected
      await reportActivity(detected)
      if (mainWindow) mainWindow.webContents.send('game:update', detected)
      updateTray()
    }
  } catch (_) {}
}

function startPolling() { stopPolling(); pollTimer = setInterval(pollGames, POLL_INTERVAL); pollGames() }
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }

// ── Tray ──────────────────────────────────────────────────────────────────────
function updateTray() {
  if (!tray) return

  const menu = [
    { label: 'Voxa', enabled: false },
    ...(app.isPackaged ? [{ label: `v${app.getVersion()}`, enabled: false }] : []),
    { type: 'separator' },
    currentGame
      ? { label: `🎮 Playing: ${currentGame}`, enabled: false }
      : { label: 'No game detected', enabled: false },
    { type: 'separator' },
    { label: 'Open Voxa', click: () => { if (mainWindow) mainWindow.show() } },
    { type: 'separator' },
  ]

  if (updateReady) {
    menu.push({
      label: `⬆️  Install Update${pendingVersion ? ` v${pendingVersion}` : ''}`,
      click: applyUpdate,
    })
    menu.push({ type: 'separator' })
  }

  menu.push({ label: 'Quit', click: () => { app.isQuitting = true; app.quit() } })
  tray.setContextMenu(Menu.buildFromTemplate(menu))
  tray.setToolTip(currentGame ? `Playing ${currentGame}` : 'Voxa')
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png')
  try {
    tray = new Tray(iconPath)
    tray.on('click', () => {
      if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    })
    updateTray()
  } catch (_) {}
}

// ── Main Window ───────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    title: 'Voxa',
    backgroundColor: '#111214',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(VOXA_URL + '/voxa/me')

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('auth:token', (_event, token) => { authToken = token; startPolling() })
ipcMain.on('auth:logout', () => {
  authToken = null
  if (currentGame) { reportActivity(null).catch(() => {}); currentGame = null; updateTray() }
  stopPolling()
})

ipcMain.on('app:open', () => {
  if (mainWindow) mainWindow.loadURL(VOXA_URL)
})

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  try { createTray() } catch (_) {}
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('before-quit', async () => {
  app.isQuitting = true
  stopPolling()
  if (authToken && currentGame) await reportActivity(null).catch(() => {})
})

// On macOS, don't quit when all windows are closed — keep running in tray
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
