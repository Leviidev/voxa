const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const { exec } = require('child_process')
const path = require('path')
const https = require('https')
const http = require('http')

// ── Config ────────────────────────────────────────────────────────────────────
const VOXA_URL = process.env.VOXA_URL || 'https://voxa.lol'
const API_BASE = process.env.API_URL || 'https://voxa.lol'
const POLL_INTERVAL = 10_000

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
let updateVersion = null

// ── Auto Updater ──────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    updateVersion = info.version
    showTrayBalloon(
      'Voxa Update Available',
      `v${info.version} is downloading in the background…`
    )
    updateTray()
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true
    updateVersion = info.version
    updateTray()
    showTrayBalloon(
      'Voxa Update Ready',
      `v${info.version} downloaded. Click "Restart & Update" in the tray to install.`
    )
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message)
  })

  const check = () => autoUpdater.checkForUpdates().catch(() => {})
  setTimeout(check, 5_000)
  setInterval(check, 4 * 60 * 60 * 1000)
}

function showTrayBalloon(title, content) {
  if (tray && process.platform === 'win32') {
    try {
      tray.displayBalloon({ iconType: 'info', title, content })
    } catch (_) {}
  }
}

// ── Game Detection ────────────────────────────────────────────────────────────
function getRunningProcesses() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('tasklist /FO CSV /NH', { timeout: 8000 }, (err, stdout) => {
        if (err) return resolve([])
        const procs = stdout.split('\n')
          .map(line => {
            const match = line.match(/^"([^"]+)"/)
            return match ? match[1].toLowerCase() : null
          })
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
    if (procSet.has(game.exe.toLowerCase())) {
      return game.name
    }
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
    }, (res) => {
      res.resume()
      resolve()
    })
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
      if (mainWindow) {
        mainWindow.webContents.send('game:update', detected)
      }
      updateTray()
    }
  } catch (_) {}
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollGames, POLL_INTERVAL)
  pollGames()
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function updateTray() {
  if (!tray) return
  const label = currentGame ? `Playing ${currentGame}` : 'Voxa'
  tray.setToolTip(label)

  const menuTemplate = [
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
    menuTemplate.push({
      label: `⬆️  Restart & Update${updateVersion ? ` to v${updateVersion}` : ''}`,
      click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Restart to Update',
          message: `Voxa ${updateVersion ? `v${updateVersion}` : 'update'} is ready to install.`,
          detail: 'Voxa will restart and install the update now.',
          buttons: ['Restart & Update', 'Later'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) autoUpdater.quitAndInstall()
        })
      },
    })
    menuTemplate.push({ type: 'separator' })
  }

  menuTemplate.push({ label: 'Quit', click: () => app.quit() })

  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate))
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png')
  try {
    tray = new Tray(iconPath)
  } catch {
    return
  }
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  })
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
    backgroundColor: '#0B0B0C',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(VOXA_URL)

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
ipcMain.on('auth:token', (_event, token) => {
  authToken = token
  startPolling()
})

ipcMain.on('auth:logout', () => {
  authToken = null
  if (currentGame) {
    reportActivity(null).catch(() => {})
    currentGame = null
    updateTray()
  }
  stopPolling()
})

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  try { createTray() } catch (_) {}
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', async () => {
  app.isQuitting = true
  stopPolling()
  if (authToken && currentGame) {
    await reportActivity(null).catch(() => {})
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
