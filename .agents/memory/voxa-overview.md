---
name: Voxa project overview
description: Key architecture decisions, design system, and deployment notes for voxa.lol
---

## Architecture

- **Monorepo**: `website/` (React+Vite frontend + Express API), `ios/` (Swift/SwiftUI — paused)
- **Frontend**: React + Vite, port 5000. Workflow: "Start application" → `cd website && npm run dev`
- **API**: Express in `website/server/`, port 3001. Workflow: "API Server" → `cd website && npm run api`
- **Vite proxy**: `/api` → `http://localhost:3001` (configured in `vite.config.js`)
- **API routes**: `/api/auth/*`, `/api/users/*`, `/api/servers/*`, `/api/channels/*`, `/api/messages/*`, `/api/invites/*`
- **Auth**: JWT via `jsonwebtoken`, middleware at `server/middleware/auth.js`, JWT_SECRET stored as env var, tokens stored in localStorage as `voxa_token`
- **Persistence**: Replit PostgreSQL via `pg` Pool (`DATABASE_URL` env var). All db.js functions are async — all route handlers must use `async/await`.
- **Rate limiting**: express-rate-limit — auth: 8/15min, general: 200/5min, messages: 30/min

## Database Schema (PostgreSQL)

Tables: `users`, `servers`, `categories`, `channels`, `messages`, `server_members`, `roles`, `member_roles`, `invites`
- Snake_case columns in DB; camelCase in API responses (mapped in db.js)
- All `db.js` functions return Promises — every route handler must `await` them

## Design System (Light Theme)

- Primary bg: `#FFFFFF`, Sidebar: `#F2F3F5`, Sidebar dark: `#E3E5E8`
- Hover: `#EAEBEE`, Selected: `#E0E2E6`, Input: `#EAEBEE`, Border: `#E3E5E8`
- Accent red: `#E53935` (brand color), Red dark: `#C62828`
- Text: `#1A1B1E` (header/bold), `#313439` (body), `#5C6068` (muted), `#96989D` (dim)
- Support email: voxa@voxa.lol (shown in footer and login page)

## Key Design Decisions

- Server sidebar (220px) shows server **names** as full rows — intentionally NOT icon-only like Discord
- Server settings gear icon appears on hover over server name in channel sidebar header
- `mockData.js` still exists in `src/data/` but nothing imports it (orphan file, safe to delete later)
- Login form uses `noValidate` to suppress browser-native validation messages

**Why:** User wanted unique non-Discord UI, light theme, clean editorial feel

## User Profile Fields

All stored in DB user object and returned from `/api/users/me`:
- `displayName` — overrides username in chat
- `bio` — short bio text (190 char max)
- `customStatus` — shown below username in user panel
- `avatarUrl` — image URL (optional; fallback to color circle)
- `avatarColor` — hex color for avatar circle
- `bannerUrl` — profile banner image URL
- `bannerColor` — fallback banner color
- `status` — online | idle | dnd | offline

## Roles System

- Per-server roles in `roles` table: columns `id, server_id, name, color, hoist, position, permissions (TEXT[]), is_default, created_at`
- `@everyone` role auto-created when server is created (is_default: true)
- `member_roles` table: `(server_id, user_id, role_id)` composite PK
- Valid permissions: `administrator, manage_server, manage_roles, manage_channels, kick_members, ban_members, manage_messages, send_messages, read_messages`

## Invites System

- `invites` table: `id, code, server_id, inviter_id, uses, max_uses, expires_at, created_at`
- Invite codes are 8-char uppercase alphanumeric
- Join URL pattern: `{origin}/invite/{CODE}`
- Each inviter gets one reused invite per server (idempotent `POST /api/servers/:id/invites`)
- Frontend route: `/invite/:code` → `InviteJoin.jsx` page

## Key UI Components

- `ProfileEditModal.jsx` — tabbed modal (General, Avatar, Banner); opened from Me.jsx edit button or Settings → Edit Profile
- `ServerSettingsModal.jsx` — tabbed modal (Overview, Roles, Members, Invites, Danger Zone); opened from hover gear icon on channel sidebar server header
- `InviteJoin.jsx` — standalone page at `/invite/:code` for joining via invite link

## Express 5 Quirk

- Express 5 (installed) uses `path-to-regexp` v8 which rejects `/api/*` and `/api/(.*)` wildcards in `app.use()`
- Use a plain middleware with `req.path.startsWith('/api/')` check for catch-all routes
- **Why:** Breaking change from Express 4 path handling

## Rate Limiting Note

- `express-rate-limit` v7 `keyGenerator` that uses `req.ip` will throw `ERR_ERL_KEY_GEN_IPV6` validation error
- Use default keyGenerator (no custom one) unless you need per-user limiting — the default handles IPv6 correctly

## Real-time (Socket.IO)

- Server: `socket.io` on the same HTTP server as Express (`createServer(app)` + `httpServer.listen`)
- Vite proxies `/socket.io` → `http://localhost:3001` with `ws: true`
- Client singleton in `src/lib/socket.js` — call `getSocket(token)` once; reconnects automatically
- `SocketContext.jsx` wraps the app (inside AuthProvider); provides `{ socket, connected }`
- Channel rooms: `ch:{channelId}` — join on channel mount, leave on unmount
- Socket events: `message:new`, `message:edit`, `message:delete`, `reaction:update`, `typing:update`
- Typing: `typing:start { channelId, username }` / `typing:stop { channelId }` — server auto-clears after 4s
- Route handlers emit to `req.app.locals.io`

## Reactions

- `message_reactions` table: `(message_id, user_id, emoji)` composite PK
- Toggle endpoint: `POST /api/messages/:msgId/reactions { emoji }` — adds or removes
- `getMessages` query uses correlated subquery to attach reactions as `jsonb_object_agg`
- `reaction:update` socket event carries `{ messageId, channelId, reactions }` — full reactions map
- Quick-pick bar: 8 common emojis on hover; highlighted pill if current user reacted

## API Client (frontend)

- `src/lib/api.js` checks `content-type` header before calling `res.json()` — returns "Server is starting up" message if HTML is received instead of JSON
- This prevents "doctype is not valid JSON" / "string did not match expected pattern" errors on all browsers
