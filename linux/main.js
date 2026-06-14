const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, Notification } = require('electron')
const { exec, spawn } = require('child_process')
const { createHash } = require('crypto')
const path = require('path')
const https = require('https')
const http = require('http')
const fs = require('fs')
const os = require('os')

// ── Single instance ───────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

// ── Config ────────────────────────────────────────────────────────────────────
const VOXA_URL = process.env.VOXA_URL || 'https://voxa.lol'
const API_BASE = process.env.API_URL || 'https://voxa.lol'
const POLL_INTERVAL = 10_000
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000

// ── Game Database (Linux process names) ───────────────────────────────────────
// Linux process names from `ps -eo comm=`. On Linux, comm is truncated to 15 chars
// by the kernel; args= gives the full path for cmdContains disambiguation.
const GAMES = [
  // Battle Royale
  { name: 'Apex Legends',             exe: 'r5apex' },
  { name: 'PUBG',                     exe: 'tslgame' },
  // FPS
  { name: 'CS2',                      exe: 'cs2' },
  { name: 'CS:GO',                    exe: 'csgo_linux64' },
  { name: 'Destiny 2',                exe: 'destiny2' },
  // MOBAs
  { name: 'Dota 2',                   exe: 'dota2' },
  // Sports
  { name: 'Rocket League',            exe: 'RocketLeague' },
  // Survival / Sandbox
  { name: 'Minecraft: Java Edition',  exe: 'java', cmdContains: 'minecraft' },
  { name: 'Valheim',                  exe: 'valheim.x86_64' },
  { name: 'Terraria',                 exe: 'Terraria' },
  { name: 'Subnautica',               exe: 'Subnautica' },
  { name: 'Stardew Valley',           exe: 'StardewValley' },
  { name: 'No Man\'s Sky',            exe: 'NMS.x86_64' },
  { name: 'The Forest',               exe: 'TheForest' },
  // Social / Party
  { name: 'Among Us',                 exe: 'Among Us' },
  { name: 'Phasmophobia',             exe: 'Phasmophobia' },
  { name: 'Lethal Company',           exe: 'Lethal Company' },
  // RPG / Action
  { name: 'Hollow Knight',            exe: 'hollow_knight' },
  { name: 'Genshin Impact',           exe: 'GenshinImpact' },
  { name: 'Warframe',                 exe: 'Warframe.x86_64' },
  { name: 'Baldur\'s Gate 3',         exe: 'bg3' },
  { name: 'Hades',                    exe: 'Hades' },
  { name: 'Hades II',                 exe: 'Hades2' },
  { name: 'Path of Exile',            exe: 'PathOfExile' },
  { name: 'Dead by Daylight',         exe: 'DeadByDaylight' },
  { name: 'Elden Ring',               exe: 'eldenring' },
  // Platformer
  { name: 'Celeste',                  exe: 'Celeste' },
  { name: 'Cuphead',                  exe: 'Cuphead' },
  // Strategy
  { name: 'StarCraft II',             exe: 'SC2_x64' },
  { name: 'Civilization VI',          exe: 'CivilizationVI' },
  // Other
  { name: 'Factorio',                 exe: 'factorio' },
  { name: 'RimWorld',                 exe: 'RimWorldLinux' },
  { name: 'Dwarf Fortress',           exe: 'dwarfort' },
]

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null
let tray = null
let authToken = null
let currentGame = null
let pollTimer = null
let updateReady = false
let pendingAppImagePath = null
let pendingVersion = null

// ── Custom Updater ────────────────────────────────────────────────────────────

function getUpdateStatePath() {
  return path.join(app.getPath('userData'), 'voxa-update-state.json')
}

function loadUpdateState() {
  try { return JSON.parse(fs.readFileSync(getUpdateStatePath(), 'utf8')) }
  catch { return { installedSha256: null } }
}

function saveUpdateState(state) {
  try { fs.writeFileSync(getUpdateStatePath(), JSON.stringify(state), 'utf8') } catch (_) {}
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
        file.close(); fs.unlink(destPath, () => {})
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { file.close(); return reject(new Error(`HTTP ${res.statusCode}`)) }
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
    const info = await fetchJson(`${API_BASE}/api/releases/linux/latest`)
    if (!info?.sha256) return
    const state = loadUpdateState()
    if (!state.installedSha256) { saveUpdateState({ installedSha256: info.sha256 }); return }
    if (info.sha256 === state.installedSha256) return

    console.log('[updater] New version detected, downloading…')
    showNotification('Voxa Update Available', 'Downloading update in the background…')
    updateTray()

    const tmpPath = path.join(os.tmpdir(), `voxa-update-${Date.now()}.AppImage`)
    await downloadFile(info.url, tmpPath, (pct) => {
      if (pct % 25 === 0) console.log(`[updater] Download ${pct}%`)
    })

    const downloadedSha256 = await sha256File(tmpPath)
    if (downloadedSha256 !== info.sha256) {
      fs.unlink(tmpPath, () => {})
      console.error('[updater] SHA-256 mismatch — update aborted')
      return
    }

    pendingAppImagePath = tmpPath
    pendingVersion = info.version || null
    updateReady = true
    updateTray()
    showNotification('Voxa Update Ready', `${pendingVersion ? `v${pendingVersion} ` : ''}ready. Click to install.`)
  } catch (err) {
    console.error('[updater] Check failed:', err.message)
  }
}

function applyUpdate() {
  if (!pendingAppImagePath || !fs.existsSync(pendingAppImagePath)) return
  dialog.showMessageBox({
    type: 'info',
    title: 'Install Update',
    message: `Voxa ${pendingVersion ? `v${pendingVersion} ` : ''}is ready.`,
    detail: 'Voxa will restart using the new version.',
    buttons: ['Restart & Update', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response !== 0) return
    try {
      // Make the new AppImage executable, launch it, then quit this instance
      fs.chmodSync(pendingAppImagePath, 0o755)
      saveUpdateState({ installedSha256: null }) // force re-record on next launch
      app.isQuitting = true
      spawn(pendingAppImagePath, [], { detached: true, stdio: 'ignore' }).unref()
      app.quit()
    } catch (err) {
      dialog.showErrorBox('Update failed', err.message)
    }
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

// Linux: `ps -eo comm=,args=`
// On Linux, comm is kernel-truncated to 15 chars; args= gives the full invocation.
function getRunningProcesses() {
  return new Promise((resolve) => {
    exec('ps -eo comm=,args=', { timeout: 8000 }, (err, stdout) => {
      if (err) return resolve([])
      const procs = stdout.split('\n').map(line => {
        const sp = line.indexOf(' ')
        return sp === -1
          ? { name: line.trim().toLowerCase(), cmdline: '' }
          : { name: line.slice(0, sp).trim().toLowerCase(), cmdline: line.slice(sp + 1).trim().toLowerCase() }
      }).filter(p => p.name)
      resolve(procs)
    })
  })
}

function detectGame(procs) {
  for (const game of GAMES) {
    const exeLower = game.exe.toLowerCase()
    const match = procs.find(p => p.name === exeLower)
    if (!match) continue
    if (game.cmdContains && match.cmdline && !match.cmdline.includes(game.cmdContains.toLowerCase())) continue
    return game.name
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
    menu.push({ label: `⬆️  Restart & Update${pendingVersion ? ` v${pendingVersion}` : ''}`, click: applyUpdate })
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
  } catch (_) {
    // Tray is optional — some Linux DEs don't support it without extra packages
  }
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
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadURL(VOXA_URL + '/voxa/me')
  mainWindow.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); mainWindow.hide() } })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('auth:token', (_event, token) => { authToken = token; startPolling() })
ipcMain.on('auth:logout', () => {
  authToken = null
  if (currentGame) { reportActivity(null).catch(() => {}); currentGame = null; updateTray() }
  stopPolling()
})
ipcMain.on('app:open', () => { if (mainWindow) mainWindow.loadURL(VOXA_URL) })
ipcMain.on('window:control', (_event, action) => {
  if (!mainWindow) return
  if (action === 'close')    mainWindow.hide()
  if (action === 'minimize') mainWindow.minimize()
  if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus() }
})

app.whenReady().then(() => {
  createWindow()
  try { createTray() } catch (_) {}
  setupAutoUpdater()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', async () => {
  app.isQuitting = true
  stopPolling()
  if (authToken && currentGame) await reportActivity(null).catch(() => {})
})

app.on('window-all-closed', () => app.quit())
