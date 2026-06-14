# Voxa Linux App

Electron-based desktop app for Linux. Wraps the Voxa web app with native OS integrations.

## Features

- **Frameless window** with custom title bar controls (−, □, ✕) matching Voxa's style
- **System tray** — minimize to tray on window close (requires `libappindicator` or equivalent)
- **Game detection** — detects running games via `ps -eo comm=,args=` every 10s
- **Auto-updater** — polls the Voxa API every 4h, downloads `.AppImage` updates in background, verifies SHA-256, then relaunches
- Targets Ubuntu 22.04+ / Debian 12+ / Fedora 38+ / Arch

## Requirements

- Node.js 18+
- For deb package: `libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils`
- For tray support: `libappindicator3-1` (Ubuntu/Debian) or equivalent

## Development

```bash
cd linux
npm install
npm start
```

## Build

```bash
npm run dist
```

Produces `Voxa-x.y.z.AppImage` and `Voxa-x.y.z.deb` in `linux/dist/`.

## Stack

- Electron 31
- electron-builder 24
- Build targets: AppImage (portable), deb (Debian/Ubuntu installer)
