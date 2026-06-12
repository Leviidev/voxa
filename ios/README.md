# Voxa iOS App

Native SwiftUI app for Voxa — mirrors all web app features.

## Requirements
- Xcode 15+
- iOS 16+ deployment target
- macOS Ventura or later (to build)

## Open in Xcode

```bash
open ios/Voxa.xcodeproj
```

Then hit **Run** (⌘R) on a simulator or connected device.

## Project Structure

```
Voxa/
├── VoxaApp.swift          # App entry point (@main)
├── RootView.swift         # Auth gate — shows Login or Main
├── Models/
│   └── Models.swift       # All data models (User, Server, Channel, Message)
├── Network/
│   └── APIClient.swift    # REST + WebSocket client (async/await)
├── ViewModels/
│   ├── AuthViewModel.swift    # Login, register, logout, demo mode
│   ├── ServersViewModel.swift # Server list, create, delete, channels
│   └── ChatViewModel.swift    # Messages, send, edit, delete, WebSocket
└── Views/
    ├── Auth/
    │   └── AuthView.swift     # Login + Register screens
    ├── Main/
    │   ├── MainView.swift         # iPad split-view / iPhone tab layout
    │   ├── ServerListView.swift   # Left server icon column
    │   ├── ChannelListView.swift  # Channel list + user panel
    │   ├── ChatView.swift         # Chat with send / edit / delete
    │   ├── DMView.swift           # Direct messages list
    │   └── VoiceChannelView       # Voice channel (embedded in ChatView)
    └── Settings/
        └── ProfileView.swift      # User settings, logout
```

## Features
- Login / Register (connects to Voxa API, falls back to demo mode offline)
- Server list with animated pill indicator
- Channel categories, text + voice channels
- Chat: send, edit (inline), delete, reactions, optimistic UI
- WebSocket real-time message delivery
- iPad: three-column `NavigationSplitView`
- iPhone: tab-based navigation
- All state persisted to `UserDefaults` (offline-first)
- Dark mode only

## API Configuration

The app connects to `https://api.voxa.lol` by default.  
To point at a local API during development, set the environment variable:

```
VOXA_API_URL=http://localhost:3001
```

In Xcode: **Product → Scheme → Edit Scheme → Run → Environment Variables**

## Bundle ID

`lol.voxa.app` — update this in Build Settings before submitting to the App Store.

## Demo Mode

On the login screen, tap **"Try without an account"** to use the app with mock data locally.
