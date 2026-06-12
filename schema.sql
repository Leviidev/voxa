-- Voxa Database Schema
-- Run this in your Render PostgreSQL database after provisioning

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  discriminator TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  custom_status TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  banner_url TEXT,
  banner_color TEXT,
  status TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  totp_enabled BOOLEAN DEFAULT FALSE,
  totp_secret TEXT
);

CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  icon_url TEXT,
  icon_color TEXT,
  description TEXT,
  banner_url TEXT,
  banner_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  position INTEGER DEFAULT 0,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS server_members (
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  hoist BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  permissions TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_roles (
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uses INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  discriminator TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  parent_id TEXT REFERENCES messages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS dm_channels (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_participants (
  dm_channel_id TEXT NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (dm_channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  dm_channel_id TEXT NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS dm_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dm_channel_id TEXT NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dm_channel_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS email_verifications (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS totp_backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  session_key TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  ip TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
