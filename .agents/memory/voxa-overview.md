---
name: Voxa project overview
description: Key architecture decisions, design system, and deployment notes for voxa.lol
---

## Architecture

- **Monorepo**: `website/` (React+Vite frontend + Express API), `ios/` (Swift/SwiftUI), `android/` (Kotlin/Compose), `windows/` (Electron)
- **Frontend**: React + Vite, port 5000. Workflow: "Start application" → `cd website && npm run dev`
- **API**: Express in `website/server/`, port 3001. Workflow: "API Server" → `cd website && npm run api`
- **Vite proxy**: `/api` → `http://localhost:3001` (configured in `vite.config.js`)
- **Auth**: JWT via `jsonwebtoken`, middleware at `server/middleware/auth.js`, JWT_SECRET stored as Replit secret, tokens stored in localStorage as `voxa_token`
- **Persistence**: Replit PostgreSQL via `pg` Pool (`DATABASE_URL` env var). All db.js functions are async — all route handlers must use `async/await`.
- **Rate limiting**: express-rate-limit — auth: 8/15min, general: 200/5min, messages: 30/min

## Database Schema (PostgreSQL)

Tables: `users`, `servers`, `categories`, `channels`, `messages`, `message_reactions`, `server_members`, `roles`, `member_roles`, `invites`, `dm_channels`, `dm_participants`, `dm_messages`, `friend_requests`, `password_resets`, `email_verifications`, `totp_backup_codes`, `passkeys`, `webauthn_challenges`

**friend_requests table:** `id TEXT PK, from_user_id TEXT REFERENCES users, to_user_id TEXT REFERENCES users, status TEXT CHECK('pending','accepted','declined'), created_at TIMESTAMPTZ, UNIQUE(from_user_id, to_user_id)`. Friendship = accepted friend request — no separate friendships table. Routes at `/api/friends/*` via `server/routes/friends.js`.
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
- **Custom auto-updater**: no electron-updater; checks `GET /api/releases/windows/latest` on launch (+5s delay) and every 4h; compares SHA-256 with stored state in `app.getPath('userData')/voxa-update-state.json`; downloads to tmp, verifies hash, runs installer with `/S`, quits. First run records current sha256 as baseline so it never self-updates on fresh install.

## Admin Dashboard + Release System

- `releases` table: `id, platform, filename, sha256, size_bytes, version, notes, uploaded_at, uploaded_by TEXT → users.id, file_data BYTEA`
- **Release files stored in DB as BYTEA** (not filesystem — filesystem is ephemeral in production). `file_data` column added via `ALTER TABLE releases ADD COLUMN IF NOT EXISTS file_data BYTEA`.
- DB functions: `createRelease({ ..., fileData })`, `getLatestRelease(platform)`, `getReleaseFileData(platform)`, `getReleaseHistory(platform, limit)` in `db.js`
- Upload flow: multer writes temp file → `readFileSync` into buffer → stored in `releases.file_data` → temp file deleted
- Download flow: `getReleaseFileData(platform)` → `res.send(buffer)` with correct Content-Type/Disposition headers
- `website/server/routes/admin.js` — JWT admin auth (`JWT_SECRET + '_admin'`); requires `ADMIN_PASSWORD_HASH` env var
  - `POST /api/admin/auth` — bcrypt verify, returns 8h admin JWT
  - `GET /api/admin/releases` — release history
  - `POST /api/admin/releases/upload` — multer + stores file_data in DB
- `website/server/routes/releases.js` — public, mounted at both `/api/releases` and `/releases`
  - `GET /api/releases/:platform/latest` → `{ sha256, version, url, uploadedAt, sizeBytes }`
  - `GET /releases/:platform/:filename` → streams file from DB
- Frontend admin page: `website/src/pages/Admin.jsx` at route `/admin`
- **ADMIN_PASSWORD_HASH must be set** as environment secret (bcrypt hash of admin password)

## macOS Electron App (macos/)

- Entry: `macos/main.js`, `macos/preload.js`, `macos/package.json`
- `titleBarStyle: 'hiddenInset'` + `trafficLightPosition` — uses native macOS traffic lights, no custom controls injected
- Game detection: `ps -eo comm=` (macOS process names differ from Windows .exe names)
- Auto-updater: downloads `.dmg`, verifies SHA-256, then calls `open` to mount it (user drags to Applications)
- No tray balloons — uses `new Notification(...)` via Electron's Notification API
- Build: `npm run dist` → universal DMG + ZIP for x64 + arm64 in `macos/dist/`

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

## Android App (android/)

- Package: `com.voxa.app`, minSdk 26, compileSdk 34, targetSdk 34
- Stack: Kotlin 1.9.22, Jetpack Compose BOM 2024.02.00, Compose Compiler 1.5.10, AGP 8.2.2, Gradle 8.5
- Dependencies: OkHttp 4.12, kotlinx-serialization-json 1.6.3, Coil 2.6.0, DataStore 1.0.0, Navigation Compose 2.7.7, Material3
- **Socket.IO v4 client**: manual OkHttp WebSocket in `SocketClient.kt` — EIO handshake: receive `0{...}` → send `40{"token":"<JWT>"}` → receive `40{...}` = connected → events as `42["event", payload]`; ping `2` → pong `3`
- **No wrapper JAR**: `gradlew` falls back to downloaded Gradle; use `build_apk.sh` for full build (downloads JDK17+Gradle+AndroidSDK)
- Navigation: single `NavHost` in `MainScreen.kt`, bottom bar hides on chat/detail screens
- **Import rule**: `avatarColorForName()` lives in `com.voxa.app.ui.components` (Common.kt), NOT in Models.kt
- Token persistence: DataStore Preferences (`voxa_token` + `voxa_user` keys)
- API base URL hardcoded to `https://voxa.lol` in both `ApiClient.kt` and `SocketClient.kt`
- Build workflow: "Build Android APK" → `cd android && bash build_apk.sh`

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
