const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronVoxa', {
  reportToken: (token) => ipcRenderer.send('auth:token', token),
  clearToken: () => ipcRenderer.send('auth:logout'),
  onGameUpdate: (cb) => {
    ipcRenderer.on('game:update', (_event, game) => cb(game))
    return () => ipcRenderer.removeAllListeners('game:update')
  },
  openApp: () => ipcRenderer.send('app:open'),
  windowControl: (action) => ipcRenderer.send('window:control', action),
  isElectron: true,
  platform: process.platform,
})

// Inject frameless window controls into every page
window.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div')
  bar.id = '_voxa_titlebar'
  bar.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:38px',
    'z-index:2147483647',
    '-webkit-app-region:drag',
    'pointer-events:none',
    'display:flex',
    'align-items:center',
    'padding:0 12px',
  ].join(';')

  const btns = document.createElement('div')
  btns.style.cssText = [
    'display:flex',
    'gap:8px',
    '-webkit-app-region:no-drag',
    'pointer-events:all',
  ].join(';')

  const specs = [
    { color: '#FF5F57', action: 'close',    title: 'Close' },
    { color: '#FEBC2E', action: 'minimize',  title: 'Minimize' },
    { color: '#28C840', action: 'maximize',  title: 'Maximize' },
  ]

  specs.forEach(({ color, action, title }) => {
    const btn = document.createElement('button')
    btn.title = title
    btn.style.cssText = [
      `background:${color}`,
      'width:12px',
      'height:12px',
      'border-radius:50%',
      'border:none',
      'cursor:pointer',
      'padding:0',
      'transition:filter 0.15s',
      'flex-shrink:0',
    ].join(';')
    btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(0.8)' })
    btn.addEventListener('mouseleave', () => { btn.style.filter = '' })
    btn.addEventListener('click', () => ipcRenderer.send('window:control', action))
    btns.appendChild(btn)
  })

  bar.appendChild(btns)
  document.body.appendChild(bar)
})
