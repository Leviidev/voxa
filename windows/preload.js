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

// Inject Windows-style frameless controls (top-right, always on top)
window.addEventListener('DOMContentLoaded', () => {
  // Drag region — full width, 32px tall, transparent
  const dragBar = document.createElement('div')
  dragBar.id = '_voxa_drag'
  dragBar.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:32px',
    'z-index:2147483647',
    '-webkit-app-region:drag',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(dragBar)

  // Windows-style control buttons — top-right
  const controls = document.createElement('div')
  controls.id = '_voxa_controls'
  controls.style.cssText = [
    'position:fixed',
    'top:0',
    'right:0',
    'z-index:2147483648',
    'display:flex',
    'align-items:stretch',
    '-webkit-app-region:no-drag',
    'pointer-events:all',
    'height:32px',
  ].join(';')

  const btns = [
    { label: '&#x2212;', action: 'minimize', hoverBg: 'rgba(255,255,255,0.1)', hoverColor: '#fff' },
    { label: '&#x25A1;', action: 'maximize', hoverBg: 'rgba(255,255,255,0.1)', hoverColor: '#fff' },
    { label: '&#x2715;', action: 'close',    hoverBg: '#E53935',               hoverColor: '#fff' },
  ]

  btns.forEach(({ label, action, hoverBg, hoverColor }) => {
    const btn = document.createElement('button')
    btn.innerHTML = label
    btn.style.cssText = [
      'background:transparent',
      'border:none',
      'color:rgba(255,255,255,0.7)',
      'cursor:pointer',
      'width:46px',
      'height:32px',
      'font-size:12px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'transition:background 0.1s, color 0.1s',
      'padding:0',
      'font-family:inherit',
    ].join(';')
    btn.addEventListener('mouseenter', () => {
      btn.style.background = hoverBg
      btn.style.color = hoverColor
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent'
      btn.style.color = 'rgba(255,255,255,0.7)'
    })
    btn.addEventListener('click', () => ipcRenderer.send('window:control', action))
    controls.appendChild(btn)
  })

  document.body.appendChild(controls)
})
