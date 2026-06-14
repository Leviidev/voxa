const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog } = require('electron')
const { exec, execFile } = require('child_process')
const { createHash, createReadStream: fsCreateReadStream } = require('crypto')
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

// ── Game Database ─────────────────────────────────────────────────────────────
const GAMES = [
  // Battle Royale
  { name: 'Fortnite',                  exe: 'FortniteClient-Win64-Shipping.exe' },
  { name: 'Apex Legends',             exe: 'r5apex.exe' },
  { name: 'PUBG',                     exe: 'TslGame.exe' },
  { name: 'Call of Duty: Warzone',    exe: 'ModernWarfare.exe' },
  { name: 'Call of Duty: Warzone',    exe: 'cod.exe' },
  // FPS
  { name: 'CS2',                      exe: 'cs2.exe' },
  { name: 'CS:GO',                    exe: 'csgo.exe' },
  { name: 'Valorant',                 exe: 'VALORANT-Win64-Shipping.exe' },
  { name: 'Overwatch 2',              exe: 'Overwatch.exe' },
  { name: 'Rainbow Six Siege',        exe: 'RainbowSix.exe' },
  { name: 'Halo Infinite',            exe: 'HaloInfinite.exe' },
  { name: 'Destiny 2',                exe: 'destiny2.exe' },
  { name: 'Titanfall 2',              exe: 'Titanfall2.exe' },
  { name: 'Paladins',                 exe: 'Paladins.exe' },
  // MOBAs
  { name: 'League of Legends',        exe: 'League of Legends.exe' },
  { name: 'Dota 2',                   exe: 'dota2.exe' },
  { name: 'Smite',                    exe: 'Smite.exe' },
  // Sports
  { name: 'Rocket League',            exe: 'RocketLeague.exe' },
  { name: 'EA FC 25',                 exe: 'EASFC25.exe' },
  { name: 'NBA 2K25',                 exe: 'NBA2K25.exe' },
  { name: 'Madden NFL 25',            exe: 'MaddenNFL25.exe' },
  // Survival / Sandbox
  { name: 'Minecraft',                exe: 'Minecraft.Windows.exe' },
  { name: 'Minecraft: Java Edition',  exe: 'javaw.exe', cmdContains: 'minecraft' },
  { name: 'Rust',                     exe: 'rust.exe' },
  { name: 'Valheim',                  exe: 'valheim.exe' },
  { name: 'Terraria',                 exe: 'Terraria.exe' },
  { name: 'ARK',                      exe: 'ShooterGame.exe' },
  { name: '7 Days to Die',            exe: '7DaysToDie.exe' },
  { name: 'Subnautica',               exe: 'Subnautica.exe' },
  // Social / Party
  { name: 'Among Us',                 exe: 'Among Us.exe' },
  { name: 'Fall Guys',                exe: 'FallGuys_client_game.exe' },
  { name: 'Roblox',                   exe: 'RobloxPlayerBeta.exe' },
  { name: 'Phasmophobia',             exe: 'Phasmophobia.exe' },
  { name: 'Lethal Company',           exe: 'Lethal Company.exe' },
  { name: 'Content Warning',          exe: 'Content Warning.exe' },
  // RPG / Action
  { name: 'Elden Ring',               exe: 'eldenring.exe' },
  { name: 'Cyberpunk 2077',           exe: 'Cyberpunk2077.exe' },
  { name: 'GTA V',                    exe: 'GTA5.exe' },
  { name: 'Red Dead Redemption 2',    exe: 'RDR2.exe' },
  { name: 'The Witcher 3',            exe: 'witcher3.exe' },
  { name: 'Hollow Knight',            exe: 'hollow_knight.exe' },
  { name: 'Stardew Valley',           exe: 'StardewValley.exe' },
  { name: 'Genshin Impact',           exe: 'GenshinImpact.exe' },
  { name: 'Dead by Daylight',         exe: 'DeadByDaylight-Win64-Shipping.exe' },
  { name: 'Warframe',                 exe: 'Warframe.x64.exe' },
  { name: 'Monster Hunter: World',    exe: 'MonsterHunterWorld.exe' },
  { name: 'Dark Souls III',           exe: 'DarkSoulsIII.exe' },
  { name: 'Sekiro',                   exe: 'sekiro.exe' },
  { name: 'Baldur\'s Gate 3',         exe: 'bg3.exe' },
  { name: 'Hades',                    exe: 'Hades.exe' },
  { name: 'Hades II',                 exe: 'Hades2.exe' },
  { name: 'Path of Exile',            exe: 'PathOfExile.exe' },
  { name: 'Diablo IV',                exe: 'Diablo IV.exe' },
  { name: 'Palworld',                 exe: 'Palworld.exe' },
  // Platformer
  { name: 'Geometry Dash',            exe: 'GeometryDash.exe' },
  { name: 'Celeste',                  exe: 'Celeste.exe' },
  { name: 'Cuphead',                  exe: 'Cuphead.exe' },
  // Strategy
  { name: 'Age of Empires IV',        exe: 'AoE4.exe' },
  { name: 'Civilization VI',          exe: 'CivilizationVI.exe' },
  { name: 'StarCraft II',             exe: 'SC2.exe' },
  { name: 'Total War: Warhammer III', exe: 'Warhammer3.exe' },
  // Racing
  { name: 'Forza Horizon 5',          exe: 'ForzaHorizon5.exe' },
  { name: 'Need for Speed',           exe: 'NeedForSpeed.exe' },
  // Simulation
  { name: 'The Sims 4',               exe: 'TS4_x64.exe' },
  { name: 'Flight Simulator',         exe: 'FlightSimulator.exe' },
  // Fighting
  { name: 'Street Fighter 6',         exe: 'StreetFighter6.exe' },
  { name: 'Tekken 8',                 exe: 'Tekken8.exe' },
  { name: 'Mortal Kombat 1',          exe: 'MK1.exe' },
]

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null
let tray = null
let authToken = null
let currentGame = null
let pollTimer = null
let updateReady = false
let pendingInstallerPath = null
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
    const info = await fetchJson(`${API_BASE}/api/releases/windows/latest`)
    if (!info?.sha256) return

    const state = loadUpdateState()

    // First run — record the current sha256 as "installed" so we don't update immediately
    if (!state.installedSha256) {
      saveUpdateState({ installedSha256: info.sha256 })
      return
    }

    if (info.sha256 === state.installedSha256) return

    // New version available — download it
    console.log('[updater] New version detected, downloading…')
    showTrayBalloon('Voxa Update Available', 'Downloading update in the background…')
    updateTray()

    const tmpPath = path.join(os.tmpdir(), `voxa-update-${Date.now()}.exe`)
    await downloadFile(info.url, tmpPath, (pct) => {
      if (pct % 25 === 0) console.log(`[updater] Download ${pct}%`)
    })

    // Verify SHA-256 integrity
    const downloadedSha256 = await sha256File(tmpPath)
    if (downloadedSha256 !== info.sha256) {
      fs.unlink(tmpPath, () => {})
      console.error('[updater] SHA-256 mismatch — update aborted')
      return
    }

    // Update is ready
    pendingInstallerPath = tmpPath
    pendingVersion = info.version || null
    updateReady = true
    updateTray()
    showTrayBalloon(
      'Voxa Update Ready',
      `${pendingVersion ? `v${pendingVersion} ` : ''}downloaded. Click "Restart & Update" in the tray.`
    )
  } catch (err) {
    console.error('[updater] Check failed:', err.message)
  }
}

function applyUpdate() {
  if (!pendingInstallerPath || !fs.existsSync(pendingInstallerPath)) return

  const installer = pendingInstallerPath

  dialog.showMessageBox({
    type: 'info',
    title: 'Restart to Update',
    message: `Voxa ${pendingVersion ? `v${pendingVersion} ` : ''}update is ready.`,
    detail: 'Voxa will close and the installer will run. It will restart automatically when done.',
    buttons: ['Restart & Update', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response !== 0) return

    // Record new sha256 BEFORE quitting so the next launch knows it's installed
    sha256File(installer).then(hash => {
      saveUpdateState({ installedSha256: hash })
      app.isQuitting = true
      execFile(installer, ['/S'], { detached: true })
      setTimeout(() => app.quit(), 500)
    }).catch(() => {
      app.isQuitting = true
      execFile(installer, ['/S'], { detached: true })
      setTimeout(() => app.quit(), 500)
    })
  })
}

function setupAutoUpdater() {
  if (!app.isPackaged) return
  const check = () => checkForUpdates().catch(() => {})
  setTimeout(check, 8_000)
  setInterval(check, UPDATE_CHECK_INTERVAL)
}

// ── Tray balloon helper ────────────────────────────────────────────────────────
function showTrayBalloon(title, content) {
  if (tray && process.platform === 'win32') {
    try { tray.displayBalloon({ iconType: 'info', title, content }) } catch (_) {}
  }
}

// ── Game Detection ────────────────────────────────────────────────────────────
function getRunningProcesses() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('tasklist /FO CSV /NH', { timeout: 8000 }, (err, stdout) => {
        if (err) return resolve([])
        const procs = stdout.split('\n')
          .map(line => { const m = line.match(/^"([^"]+)"/); return m ? m[1].toLowerCase() : null })
          .filter(Boolean)
        resolve(procs)
      })
    } else {
      exec('ps -eo comm', { timeout: 8000 }, (err, stdout) => {
        if (err) return resolve([])
        resolve(stdout.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean))
      })
    }
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
  tray.setToolTip(currentGame ? `Playing ${currentGame}` : 'Voxa')

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
      label: `⬆️  Restart & Update${pendingVersion ? ` to v${pendingVersion}` : ''}`,
      click: applyUpdate,
    })
    menu.push({ type: 'separator' })
  }

  menu.push({ label: 'Quit', click: () => app.quit() })
  tray.setContextMenu(Menu.buildFromTemplate(menu))
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png')
  try { tray = new Tray(iconPath) } catch { return }
  tray.on('click', () => { if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() })
  updateTray()
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

ipcMain.on('app:open', () => {
  if (mainWindow) mainWindow.loadURL(VOXA_URL)
})

ipcMain.on('window:control', (_event, action) => {
  if (!mainWindow) return
  if (action === 'close')    mainWindow.hide()
  if (action === 'minimize') mainWindow.minimize()
  if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})

// ── App Lifecycle ─────────────────────────────────────────────────────────────
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

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
