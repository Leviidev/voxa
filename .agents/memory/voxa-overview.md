---
name: Voxa project overview
description: Key architecture decisions, design system, and deployment notes for voxa.lol
---

## Architecture

- **Monorepo**: `website/` (React+Vite frontend + Express API), `ios/` (Swift/SwiftUI — paused)
- **Frontend**: React + Vite, port 5000. Workflow: "Start application" → `cd website && npm run dev`
- **API**: Express in `website/server/`, port 3001. Workflow: "API Server" → `cd website && npm run api`
- **Vite proxy**: `/api` → `http://localhost:3001` (configured in `vite.config.js`)
- **Auth**: JWT via `jsonwebtoken`, middleware at `server/middleware/auth.js`, JWT_SECRET stored as Replit secret, tokens stored in localStorage as `voxa_token`
- **Persistence**: Replit PostgreSQL via `pg` Pool (`DATABASE_URL` env var). All db.js functions are async — all route handlers must use `async/await`.
- **Rate limiting**: express-rate-limit — auth: 8/15min, general: 200/5min, messages: 30/min

## Database Schema (PostgreSQL)

Tables: `users`, `servers`, `categories`, `channels`, `messages`, `message_reactions`, `server_members`, `roles`, `member_roles`, `invites`, `dm_channels`, `dm_participants`, `dm_messages`, `password_resets`, `email_verifications`, `totp_backup_codes`, `passkeys`, `webauthn_challenges`
- Snake_case columns in DB; camelCase in API responses (mapped in db.js)
- All `db.js` functions return Promises — every route handler must `await` them

**Key messages quirk:** The `messages` table stores denormalized author info (`author`, `display_name`, `avatar_url`, `avatar_color`, `discriminator`, `timestamp`, `edited`, `parent_id`) — NOT just a foreign key.

**users table security columns:** `email_verified BOOLEAN`, `totp_secret TEXT`, `totp_enabled BOOLEAN`

## Deployment

Configured as **VM** (not static, not autoscale) — required for WebSocket persistence. Build: `cd website && npm install && npm run build`. Run: `cd website && node server/index.js`. The Express server serves the built React app from `website/dist/` (static middleware + catch-all to `index.html`). Server uses `process.env.PORT || process.env.API_PORT || 3001`.

**No "Made with Replit" badge on deployed apps.** Only appears in dev preview in some contexts.

## Security Features

- **Email verification**: `email_verifications` table, tokens expire 24h. Banner shown in Me.jsx for unverified users.
- **Password reset**: `password_resets` table, tokens expire 1h. Emails sent via Resend from `noreply@voxa.lol`.
- **2FA (TOTP)**: `otplib` package. Routes at `/api/auth/2fa/*`. Setup generates QR code + secret; enable verifies code + returns 8 backup codes. Login gate: returns `{ requires2FA: true, tempToken }` (5-min JWT with `_temp: true`); frontend shows code input step. **otplib ESM imports**: use `{ generateSecret, generateURI, generateSync, verifySync }` from `'otplib'` — NOT `{ authenticator }` (named export doesn't exist in ESM).
- **Passkeys (WebAuthn)**: `@simplewebauthn/server` v10 + `@simplewebauthn/browser` v10. Routes at `/api/auth/passkey/*`. Challenges stored in `webauthn_challenges` table with 5-min TTL. RP ID derived dynamically from request origin hostname. `startRegistration`/`startAuthentication` called with `{ optionsJSON: options }` in browser v10.
- **Temp tokens**: `signTempToken` / `verifyTempToken` in `middleware/auth.js`; `requireAuth` rejects tokens with `_temp: true`.
- **Security routes**: `website/server/routes/security.js` — mounted at `/api/auth` in `index.js`.

## Design System (Light Theme)

- Primary bg: `#FFFFFF`, Sidebar: `#F2F3F5`, Sidebar dark: `#E3E5E8`
- Hover: `#EAEBEE`, Selected: `#E0E2E6`, Input: `#EAEBEE`, Border: `#E3E5E8`
- Accent red: `#E53935` (brand default, user-customizable via CSS var `--accent`)
- Text: `#1A1B1E` (header/bold), `#313439` (body), `#5C6068` (muted), `#96989D` (dim)
- Support email: voxa@voxa.lol (shown in footer and login page)

## Theme System

- `ThemeContext.jsx` stores: `theme` (light/dark), `accentColor`, `fontSize`, `messageDisplay`, `reduceMotion`
- Persisted to `localStorage` as `voxa_theme_prefs` (single JSON object)
- Dark mode: `.dark` class toggled on `<html>` — CSS overrides in `index.css` target Tailwind arbitrary-value classes (e.g., `.dark .bg-\[\#F7F8FA\]`)
- Accent color applied via CSS vars `--accent`, `--accent-dark`, `--accent-subtle` on `<html>` element
- Use `.v-accent-bg` / `.v-accent-text` / `.v-accent-border` CSS utility classes to inherit accent color
- Message density stored but ChatArea not yet wired to `data-msg-display` attribute (future work)
- Notification prefs → `voxa_notif_prefs` in localStorage; Privacy prefs → `voxa_privacy_prefs`

## Windows Electron App (windows/)

- Entry: `windows/main.js` (Electron main), `windows/preload.js` (context bridge), `windows/package.json`
- Loads the Voxa website in a BrowserWindow (`VOXA_URL` env var, defaults to `https://voxa.lol`)
- Game detection: polls `tasklist /FO CSV /NH` every 10s on Windows, `ps -eo comm` on macOS/Linux; matches against 60+ game `.exe` names in the GAMES array
- IPC flow: renderer calls `window.electronVoxa.reportToken(token)` on login → main stores JWT → calls `PATCH /api/users/me/activity` when game changes → clears on logout/quit
- System tray: shows current game or "Voxa"; minimize-to-tray on window close
- Build: `npm run dist` with electron-builder → NSIS installer + portable `.exe` in `windows/dist/`
- GitHub Actions: `.github/workflows/desktop.yml` — `windows-latest` runner, uploads both artifacts

## Game Activity (backend + frontend)

- DB column: `users.game_activity TEXT` (nullable)
- `updateGameActivity(userId, game)` in `db.js`; `publicUser()` includes `gameActivity` in all user responses
- API route: `PATCH /api/users/me/activity` (in `website/server/routes/activity.js`), requires Bearer auth
- On update: emits `activity:update { userId, game }` to all `srv:{serverId}` rooms the user is in
- Frontend: `UserProfileCard.jsx` shows green "Playing X" badge with Gamepad2 icon when `member.gameActivity` is set
- Electron integration: `AuthContext.jsx` calls `window.electronVoxa?.reportToken(token)` on login/register and `window.electronVoxa?.clearToken()` on logout

## iOS App (ios/)

- `ios/Voxa.xcodeproj` — real Xcode project targeting iOS 16+, bundle ID `lol.voxa.app`
- All Swift models in `Models.swift` align exactly with backend `shapeMessage`/`getServerWithChannels` camelCase JSON
- API paths: messages → `/api/channels/:id/messages`, auth → `/api/auth/login|register|me`, servers → `/api/servers`
- Real-time uses **polling** (3s interval) not WebSocket — avoids Socket.IO protocol complexity in native Swift
- GitHub workflow (`.github/workflows/ios.yml`): uses `macos-15` runner with Xcode 16.4 explicitly selected (`sudo xcode-select -s /Applications/Xcode_16.4.app/...`); simulator build always runs; IPA export only when `IOS_CERT_BASE64`, `IOS_PROFILE_BASE64`, `APPLE_TEAM_ID` secrets are set
- **iOS build fix**: `Voxa.xcodeproj` expects `RootView.swift` at `ios/Voxa/RootView.swift` (directly in Voxa group, not under Views/). The file also exists at `ios/Voxa/Views/RootView.swift` but that path is NOT in the pbxproj build sources — only `ios/Voxa/RootView.swift` is compiled.
- `ios/ExportOptions.plist` uses `REPLACE_TEAM_ID` placeholder — `sed` replaces it in CI with `$APPLE_TEAM_ID`
- `UserAvatarBubble`, `ServerIconView`, `ServerAcronymView` defined in `ServerListView.swift` — accessible across all files in same module without import
- `User.swiftAvatarColor` and `ServerMember.swiftAvatarColor` are computed Color properties; `User.avatarColor` is `String?` (raw hex from API)

## Key Design Decisions

- Server sidebar (220px) is a **dark floating card**: `m-2 bg-[#111214] rounded-2xl shadow-2xl border border-white/[0.05]` — unique vs Discord
- App layout outer bg: `#E8EAED` so dark sidebar "floats" against it
- Server sidebar shows server **names** as full rows with icon + left red pill indicator for active
- Login form uses `noValidate` to suppress browser-native validation messages
- `mockData.js` still exists in `src/data/` but nothing imports it (orphan file, safe to delete later)

## Express 5 Quirk

- Express 5 uses `path-to-regexp` v8 which rejects `/api/*` wildcards in `app.use()`
- Use a plain middleware with `req.path.startsWith('/api/')` check for catch-all routes

## Rate Limiting Note

- `express-rate-limit` v7 `keyGenerator` that uses `req.ip` will throw `ERR_ERL_KEY_GEN_IPV6`
- Use default keyGenerator (no custom one)

## Real-time (Socket.IO)

- Server: `socket.io` on the same HTTP server as Express
- Vite proxies `/socket.io` → `http://localhost:3001` with `ws: true`
- Client singleton in `src/lib/socket.js` — call `getSocket(token)` once
- Channel rooms: `ch:{channelId}`, DM rooms: `dm:{dmId}`, Server rooms: `srv:{serverId}`
- Typing: `typing:start` / `typing:stop` — server auto-clears after 4s

## API Client (frontend)

- `src/lib/api.js` checks `content-type` header before calling `res.json()` — prevents "doctype is not valid JSON" errors
- `api.login()` can return `{ requires2FA: true, tempToken }` — frontend must handle this case in Login.jsx
