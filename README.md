# Voxa

> Imagine a Place — a free, open Discord alternative.

**voxa.lol**

## Monorepo Structure

| Folder | Contents |
|--------|----------|
| `website/` | React + Vite web app (primary focus) |
| `api/` | Node.js + Express REST API |
| `ios/` | iOS app (Swift/SwiftUI) — coming soon |
| `macos/` | macOS app — coming soon |
| `linux/` | Linux desktop app — coming soon |
| `windows/` | Windows desktop app — coming soon |
| `.github/workflows/` | CI/CD pipelines for each platform |

## Getting Started

### Website
```bash
cd website
npm install
npm run dev          # http://localhost:5000
```

### API
```bash
cd api
cp .env.example .env  # fill in your secrets
npm install
npm run dev          # http://localhost:3001
```

## Tech Stack
- **Website**: React 18, Vite, Tailwind CSS, React Router
- **API**: Node.js, Express, JWT auth, PostgreSQL-ready
- **Theme**: Red (`#E53935`) on dark backgrounds

## Routes
| Path | Description |
|------|-------------|
| `/` | Landing / marketing page |
| `/login` | Login & registration |
| `/voxa/me` | Dashboard, friends, DMs |
| `/voxa/servers/:id` | Server view |
| `/voxa/servers/:id/channels/:id` | Channel chat |

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in, get JWT |
| GET | `/api/users/me` | Current user |
| GET | `/api/servers` | List your servers |
| POST | `/api/servers` | Create a server |
| GET | `/api/channels/servers/:id/channels` | List channels |
| POST | `/api/channels/servers/:id/channels` | Create channel |
| GET | `/api/messages/channels/:id/messages` | Get messages |
| POST | `/api/messages/channels/:id/messages` | Send message |
