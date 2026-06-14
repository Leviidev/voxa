const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronVoxa', {
  // Auth
  reportToken: (token) => ipcRenderer.send('auth:token', token),
  clearToken: () => ipcRenderer.send('auth:logout'),

  // Game activity
  onGameUpdate: (cb) => {
    ipcRenderer.on('game:update', (_event, game) => cb(game))
    return () => ipcRenderer.removeAllListeners('game:update')
  },

  // Landing page → app navigation
  openApp: () => ipcRenderer.send('app:open'),

  // Frameless window controls
  windowControl: (action) => ipcRenderer.send('window:control', action),

  isElectron: true,
  platform: process.platform,
})
