# Voxa macOS App

Electron-based desktop app for macOS. Wraps the Voxa web app with native OS integrations.

## Features

- **Native traffic-light controls** — uses macOS's built-in window buttons
- **Menu bar tray** — keeps running in the background after closing the window
- **Game detection** — detects running games via `ps` and reports activity to your profile
- **Auto-updater** — polls the Voxa API every 4 hours, downloads `.dmg` updates in the background, and prompts you to install
- **SHA-256 integrity check** — verifies every downloaded update before offering to install
- Targets macOS 13+ (Ventura), Apple Silicon (arm64) + Intel (x64)

## Requirements

- Node.js 18+
- macOS 13+ to run
- Xcode Command Line Tools (for building)

## Development

```bash
cd macos
npm install
npm start
```

## Build

```bash
npm run dist
```

Produces a universal `.dmg` and `.zip` in `macos/dist/`.

## Stack

- Electron 31
- electron-builder 24
