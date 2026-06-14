const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronVoxa', {
  reportToken: (token) => ipcRenderer.send('auth:token', token),
  clearToken: () => ipcRenderer.send('auth:logout'),
  onGameUpdate: (cb) => {
    ipcRenderer.on('game:update', (_event, game) => cb(game))
    return () => ipcRenderer.removeAllListeners('game:update')
  },
  openApp: () => ipcRenderer.send('app:open'),
  isElectron: true,
  platform: process.platform,
})

// macOS uses native traffic-light buttons — inject only the drag region
window.addEventListener('DOMContentLoaded', () => {
  const dragBar = document.createElement('div')
  dragBar.id = '_voxa_drag'
  dragBar.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:28px',
    'z-index:2147483647',
    '-webkit-app-region:drag',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(dragBar)
})
