---
name: Voxa project overview
description: Key architecture decisions, design system, and deployment notes for voxa.lol
---

## Architecture

- **Monorepo**: `website/` (React+Vite frontend + Express API), `ios/` (Swift/SwiftUI — paused)
- **Frontend**: React + Vite, port 5000. Workflow: "Start application" → `cd website && npm run dev`
- **API**: Express in `website/server/`, port 3001. Workflow: "API Server" → `cd website && npm run api`
- **Vite proxy**: `/api` → `http://localhost:3001` (already configured in `vite.config.js`)
- **API routes**: `/api/auth/*`, `/api/servers/*`, `/api/channels/*`, `/api/messages/*`
- **Auth**: JWT via `jsonwebtoken`, tokens stored in `localStorage` as `voxa_token`
- **Storage**: In-memory (Map objects in `server/db.js`) — resets on API restart, no persistence yet

## Design System (Light Theme)

- Primary bg: `#FFFFFF`, Sidebar: `#F2F3F5`, Sidebar dark: `#E3E5E8`
- Hover: `#EAEBEE`, Selected: `#E0E2E6`, Input: `#EAEBEE`, Border: `#E3E5E8`
- Accent red: `#E53935` (brand color), Red dark: `#C62828`
- Text: `#1A1B1E` (header/bold), `#313439` (body), `#5C6068` (muted), `#96989D` (dim)
- All colors in `tailwind.config.js` under `voxa.*`

## Key Design Decisions

- Server sidebar (220px) shows server **names** as full rows — intentionally NOT icon-only like Discord
- No starter/mock servers — blank state until user creates a server
- `mockData.js` still exists in `src/data/` but nothing imports it (orphan file, safe to delete later)

**Why:** User wanted unique non-Discord UI, light theme, clean editorial feel

## Express 5 Quirk

- Express 5 (installed) uses `path-to-regexp` v8 which rejects `/api/*` and `/api/(.*)` wildcards
- Use a plain middleware with `req.path.startsWith('/api/')` check for catch-all routes
- **Why:** Breaking change from Express 4 path handling

## Production Notes

- For Netlify deployment: API needs Netlify Functions (serverless) — in-memory storage won't work across invocations; a real DB is required
- Domain: voxa.lol — API intended at voxa.lol/api/
- iOS app in `ios/` is paused/complete — VoxaApp.swift with full SwiftUI implementation
