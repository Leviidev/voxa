const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronVoxa', {
  reportToken: (token) => ipcRenderer.send('auth:token', token),
  clearToken: () => ipcRenderer.send('auth:logout'),
  onGameUpdate: (cb) => {
    ipcRenderer.on('game:update', (_event, game) => cb(game))
    return () => ipcRenderer.removeAllListeners('game:update')
  },
  isElectron: true,
  platform: process.platform,
})
