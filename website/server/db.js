import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('helium')) ? false : { rejectUnauthorized: false },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const generateId = (prefix = '') => prefix + randomUUID().replace(/-/g, '').slice(0, 16)

function sanitize(str, max = 2000) {
  return String(str ?? '').replace(/<[^>]*>/g, '').trim().slice(0, max)
}

function nullIfEmpty(v) {
  return v === '' ? null : v ?? null
}

function publicUser(u) {
  const { password_hash, email, ...rest } = u
  return {
    id: rest.id,
    username: rest.username,
    discriminator: rest.discriminator,
    displayName: rest.display_name,
    bio: rest.bio,
    customStatus: rest.custom_status,
    avatarUrl: rest.avatar_url,
    avatarColor: rest.avatar_color,
    bannerUrl: rest.banner_url,
    bannerColor: rest.banner_color,
    status: rest.status,
    gameActivity: rest.game_activity ?? null,
    createdAt: rest.created_at,
    emailVerified: rest.email_verified ?? false,
    totpEnabled: rest.totp_enabled ?? false,
  }
}

function publicUserFull(u) {
  return {
    ...publicUser(u),
    email: u.email,
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser({ email, username, password }) {
  const emailLower = email.toLowerCase()

  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR lower(username) = lower($2)',
    [emailLower, username]
  )
  if (existing.rows.length > 0) {
    const row = existing.rows[0]
    const byEmail = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower])
    if (byEmail.rows.length > 0) throw Object.assign(new Error('Email already registered'), { status: 409 })
    throw Object.assign(new Error('Username already taken'), { status: 409 })
  }

  if (username.length < 2 || username.length > 32)
    throw Object.assign(new Error('Username must be 2–32 characters'), { status: 400 })

  const id = generateId('u_')
  const discriminator = String(Math.floor(1000 + Math.random() * 9000))
  const passwordHash = await bcrypt.hash(password, 10)

  const { rows } = await pool.query(
    `INSERT INTO users (id, email, username, discriminator, password_hash, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'online', NOW())
     RETURNING *`,
    [id, emailLower, sanitize(username, 32), discriminator, passwordHash]
  )
  return publicUser(rows[0])
}

export async function verifyUser(email, password) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
  if (!rows.length) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  const ok = await bcrypt.compare(password, rows[0].password_hash)
  if (!ok) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  return publicUser(rows[0])
}

export async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return rows.length ? publicUser(rows[0]) : null
}

export async function getUserByIdFull(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return rows.length ? publicUserFull(rows[0]) : null
}

export async function updateUser(userId, fields) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
  if (!rows.length) throw Object.assign(new Error('User not found'), { status: 404 })

  const allowed = ['displayName', 'bio', 'customStatus', 'avatarUrl', 'avatarColor', 'bannerUrl', 'bannerColor', 'status']
  const colMap = {
    displayName: 'display_name', bio: 'bio', customStatus: 'custom_status',
    avatarUrl: 'avatar_url', avatarColor: 'avatar_color',
    bannerUrl: 'banner_url', bannerColor: 'banner_color', status: 'status',
  }
  const validStatuses = ['online', 'idle', 'dnd', 'offline']

  const setClauses = []
  const values = []
  let idx = 1

  const URL_FIELDS = new Set(['avatarUrl', 'bannerUrl'])
  for (const key of allowed) {
    if (!(key in fields)) continue
    if (key === 'status' && !validStatuses.includes(fields[key])) continue
    const maxLen = URL_FIELDS.has(key) ? 500_000 : 200
    const raw = fields[key] ?? ''
    const val = nullIfEmpty(raw === '' ? null : sanitize(raw, maxLen))
    setClauses.push(`${colMap[key]} = $${idx++}`)
    values.push(val)
  }

  if (!setClauses.length) return publicUser(rows[0])

  values.push(userId)
  const { rows: updated } = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return publicUser(updated[0])
}

// ─── Servers ─────────────────────────────────────────────────────────────────

export async function createServer({ name, ownerId }) {
  const id = generateId('srv_')
  const generalCatId = generateId('cat_')
  const generalChId = generateId('ch_')
  const voiceCatId = generateId('cat_')
  const voiceChId = generateId('vc_')
  const everyoneRoleId = generateId('role_')

  await pool.query(
    `INSERT INTO servers (id, name, owner_id, created_at) VALUES ($1, $2, $3, NOW())`,
    [id, sanitize(name, 100), ownerId]
  )
  await pool.query(
    `INSERT INTO categories (id, server_id, name, position) VALUES ($1,$2,'Text Channels',0), ($3,$2,'Voice Channels',1)`,
    [generalCatId, id, voiceCatId]
  )
  await pool.query(
    `INSERT INTO channels (id, server_id, category_id, name, type, position, created_at) VALUES
     ($1,$2,$3,'general','text',0,NOW()), ($4,$2,$5,'General','voice',0,NOW())`,
    [generalChId, id, generalCatId, voiceChId, voiceCatId]
  )
  await pool.query(
    `INSERT INTO server_members (server_id, user_id) VALUES ($1,$2)`,
    [id, ownerId]
  )
  await pool.query(
    `INSERT INTO roles (id, server_id, name, hoist, position, permissions, is_default, created_at)
     VALUES ($1,$2,'@everyone',false,0,$3,true,NOW())`,
    [everyoneRoleId, id, ['send_messages', 'read_messages']]
  )
  await pool.query(
    `INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1,$2,$3)`,
    [id, ownerId, everyoneRoleId]
  )

  return getServerWithChannels(id, ownerId)
}

export async function getServerWithChannels(serverId, userId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id = $1', [serverId])
  if (!server) return null

  const { rows: [membership] } = await pool.query(
    'SELECT 1 FROM server_members WHERE server_id=$1 AND user_id=$2',
    [serverId, userId]
  )
  if (!membership) return null

  const { rows: cats } = await pool.query(
    'SELECT * FROM categories WHERE server_id=$1 ORDER BY position', [serverId]
  )
  const { rows: channels } = await pool.query(
    'SELECT * FROM channels WHERE server_id=$1 ORDER BY position', [serverId]
  )
  const { rows: roles } = await pool.query(
    'SELECT * FROM roles WHERE server_id=$1 ORDER BY position', [serverId]
  )
  const { rows: memberRows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.discriminator, u.avatar_url, u.avatar_color, u.status,
            array_agg(mr.role_id) FILTER (WHERE mr.role_id IS NOT NULL) as role_ids
     FROM server_members sm
     JOIN users u ON u.id = sm.user_id
     LEFT JOIN member_roles mr ON mr.server_id=sm.server_id AND mr.user_id=sm.user_id
     WHERE sm.server_id=$1
     GROUP BY u.id`,
    [serverId]
  )

  const categories = cats.map(cat => ({
    id: cat.id,
    name: cat.name,
    channels: channels
      .filter(c => c.category_id === cat.id)
      .map(c => ({ id: c.id, name: c.name, type: c.type, topic: c.topic })),
  }))

  const members = memberRows.map(u => {
    const roleIds = u.role_ids || []
    const memberRoles = roles.filter(r => roleIds.includes(r.id))
    return {
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      discriminator: u.discriminator,
      avatarUrl: u.avatar_url,
      avatarColor: u.avatar_color,
      status: u.status,
      isOwner: u.id === server.owner_id,
      roles: memberRoles.map(r => ({ id: r.id, name: r.name, color: r.color })),
    }
  })

  return {
    id: server.id,
    name: server.name,
    iconUrl: server.icon_url,
    iconColor: server.icon_color,
    description: server.description,
    bannerUrl: server.banner_url,
    bannerColor: server.banner_color,
    ownerId: server.owner_id,
    createdAt: server.created_at,
    isPublic: server.is_public ?? false,
    categories,
    members,
    roles: roles.map(r => ({
      id: r.id, name: r.name, color: r.color, hoist: r.hoist,
      position: r.position, permissions: r.permissions, isDefault: r.is_default,
    })),
  }
}

export async function updateServer(serverId, userId, fields) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const colMap = {
    name: 'name', iconUrl: 'icon_url', iconColor: 'icon_color',
    description: 'description', bannerUrl: 'banner_url', bannerColor: 'banner_color',
  }
  const setClauses = []
  const values = []
  let idx = 1

  for (const [key, col] of Object.entries(colMap)) {
    if (!(key in fields)) continue
    const val = fields[key] === '' ? null : sanitize(fields[key] ?? '', key === 'name' ? 100 : 300)
    if (key === 'name' && !val?.trim()) throw Object.assign(new Error('Name cannot be empty'), { status: 400 })
    setClauses.push(`${col} = $${idx++}`)
    values.push(val)
  }

  if ('isPublic' in fields) {
    setClauses.push(`is_public = $${idx++}`)
    values.push(Boolean(fields.isPublic))
  }

  if (!setClauses.length) return server
  values.push(serverId)
  const { rows: [updated] } = await pool.query(
    `UPDATE servers SET ${setClauses.join(', ')} WHERE id=$${idx} RETURNING *`,
    values
  )
  return {
    id: updated.id, name: updated.name, iconUrl: updated.icon_url, iconColor: updated.icon_color,
    description: updated.description, bannerUrl: updated.banner_url, bannerColor: updated.banner_color,
    ownerId: updated.owner_id, createdAt: updated.created_at, isPublic: updated.is_public,
  }
}

export async function discoverServers({ query = '', limit = 50, offset = 0 } = {}) {
  const search = `%${query.toLowerCase()}%`
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.icon_url, s.icon_color, s.description, s.banner_url, s.banner_color, s.is_public,
            COUNT(sm.user_id)::int AS member_count
     FROM servers s
     LEFT JOIN server_members sm ON sm.server_id = s.id
     WHERE s.is_public = true AND (lower(s.name) LIKE $1 OR lower(COALESCE(s.description,'')) LIKE $1)
     GROUP BY s.id
     ORDER BY member_count DESC, s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [search, limit, offset]
  )
  return rows.map(s => ({
    id: s.id, name: s.name, iconUrl: s.icon_url, iconColor: s.icon_color,
    description: s.description, bannerUrl: s.banner_url, bannerColor: s.banner_color,
    isPublic: s.is_public, memberCount: s.member_count,
  }))
}

export async function joinPublicServer(serverId, userId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (!server.is_public) throw Object.assign(new Error('This server is not public'), { status: 403 })

  const { rows: [existing] } = await pool.query(
    'SELECT 1 FROM server_members WHERE server_id=$1 AND user_id=$2', [serverId, userId]
  )
  if (existing) return getServerWithChannels(serverId, userId)

  await pool.query('INSERT INTO server_members (server_id, user_id) VALUES ($1,$2)', [serverId, userId])
  const { rows: [defaultRole] } = await pool.query(
    'SELECT id FROM roles WHERE server_id=$1 AND is_default=true', [serverId]
  )
  if (defaultRole) {
    await pool.query(
      'INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [serverId, userId, defaultRole.id]
    )
  }
  return getServerWithChannels(serverId, userId)
}

export async function getUserServers(userId) {
  const { rows } = await pool.query(
    'SELECT server_id FROM server_members WHERE user_id=$1', [userId]
  )
  const servers = await Promise.all(rows.map(r => getServerWithChannels(r.server_id, userId)))
  return servers.filter(Boolean).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function deleteServer(serverId, userId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  await pool.query('DELETE FROM servers WHERE id=$1', [serverId])
}

export async function leaveServer(serverId, userId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id === userId) throw Object.assign(new Error('Owner cannot leave — delete server instead'), { status: 400 })
  await pool.query('DELETE FROM server_members WHERE server_id=$1 AND user_id=$2', [serverId, userId])
  await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2', [serverId, userId])
}

export async function kickMember(serverId, requesterId, targetId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  if (targetId === requesterId) throw Object.assign(new Error('Cannot kick yourself'), { status: 400 })
  await pool.query('DELETE FROM server_members WHERE server_id=$1 AND user_id=$2', [serverId, targetId])
  await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2', [serverId, targetId])
}

// ─── Roles ───────────────────────────────────────────────────────────────────

const VALID_PERMISSIONS = [
  'administrator', 'manage_server', 'manage_roles', 'manage_channels',
  'kick_members', 'ban_members', 'manage_messages', 'send_messages', 'read_messages',
]

export async function getRoles(serverId) {
  const { rows } = await pool.query('SELECT * FROM roles WHERE server_id=$1 ORDER BY position', [serverId])
  return rows.map(r => ({
    id: r.id, name: r.name, color: r.color, hoist: r.hoist,
    position: r.position, permissions: r.permissions, isDefault: r.is_default, createdAt: r.created_at,
  }))
}

export async function createRole(serverId, requesterId, { name, color, hoist, permissions }) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) FROM roles WHERE server_id=$1', [serverId])
  const id = generateId('role_')
  const perms = Array.isArray(permissions) ? permissions.filter(p => VALID_PERMISSIONS.includes(p)) : []
  const { rows: [role] } = await pool.query(
    `INSERT INTO roles (id, server_id, name, color, hoist, position, permissions, is_default, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW()) RETURNING *`,
    [id, serverId, sanitize(name, 64), color || null, Boolean(hoist), parseInt(count), perms]
  )
  return { id: role.id, name: role.name, color: role.color, hoist: role.hoist, position: role.position, permissions: role.permissions, isDefault: role.is_default }
}

export async function updateRole(serverId, requesterId, roleId, fields) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [role] } = await pool.query('SELECT * FROM roles WHERE id=$1 AND server_id=$2', [roleId, serverId])
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 })
  if (role.is_default) throw Object.assign(new Error('Cannot modify @everyone'), { status: 400 })

  const setClauses = []
  const values = []
  let idx = 1
  if (fields.name) { setClauses.push(`name=$${idx++}`); values.push(sanitize(fields.name, 64)) }
  if (fields.color !== undefined) { setClauses.push(`color=$${idx++}`); values.push(fields.color || null) }
  if (fields.hoist !== undefined) { setClauses.push(`hoist=$${idx++}`); values.push(Boolean(fields.hoist)) }
  if (Array.isArray(fields.permissions)) {
    setClauses.push(`permissions=$${idx++}`)
    values.push(fields.permissions.filter(p => VALID_PERMISSIONS.includes(p)))
  }
  if (!setClauses.length) return role
  values.push(roleId)
  const { rows: [updated] } = await pool.query(
    `UPDATE roles SET ${setClauses.join(', ')} WHERE id=$${idx} RETURNING *`, values
  )
  return { id: updated.id, name: updated.name, color: updated.color, hoist: updated.hoist, position: updated.position, permissions: updated.permissions, isDefault: updated.is_default }
}

export async function deleteRole(serverId, requesterId, roleId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [role] } = await pool.query('SELECT * FROM roles WHERE id=$1', [roleId])
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 })
  if (role.is_default) throw Object.assign(new Error('Cannot delete @everyone'), { status: 400 })
  await pool.query('DELETE FROM roles WHERE id=$1', [roleId])
}

export async function assignRole(serverId, requesterId, targetUserId, roleId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [role] } = await pool.query('SELECT id FROM roles WHERE id=$1 AND server_id=$2', [roleId, serverId])
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 })
  await pool.query(
    'INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
    [serverId, targetUserId, roleId]
  )
}

export async function removeRole(serverId, requesterId, targetUserId, roleId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.owner_id !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [role] } = await pool.query('SELECT * FROM roles WHERE id=$1', [roleId])
  if (role?.is_default) throw Object.assign(new Error('Cannot remove @everyone'), { status: 400 })
  await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=$3', [serverId, targetUserId, roleId])
}

// ─── Channels ────────────────────────────────────────────────────────────────

export async function createChannel({ serverId, name, type, userId }) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })

  const targetName = type === 'voice' ? 'Voice Channels' : 'Text Channels'
  const { rows: cats } = await pool.query('SELECT * FROM categories WHERE server_id=$1', [serverId])
  const targetCat = cats.find(c => c.name === targetName) || cats[0]

  const { rows: [{ count }] } = await pool.query(
    'SELECT COUNT(*) FROM channels WHERE server_id=$1 AND category_id=$2',
    [serverId, targetCat?.id]
  )

  const id = generateId(type === 'voice' ? 'vc_' : 'ch_')
  const safeName = sanitize(name, 100).toLowerCase().replace(/\s+/g, '-')
  const { rows: [ch] } = await pool.query(
    `INSERT INTO channels (id, server_id, category_id, name, type, position, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
    [id, serverId, targetCat?.id || null, safeName, type, parseInt(count)]
  )
  return { id: ch.id, name: ch.name, type: ch.type }
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export async function createInvite(serverId, inviterId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  const { rows: [member] } = await pool.query(
    'SELECT 1 FROM server_members WHERE server_id=$1 AND user_id=$2', [serverId, inviterId]
  )
  if (!member) throw Object.assign(new Error('Not a member'), { status: 403 })

  const { rows: [existing] } = await pool.query(
    'SELECT * FROM invites WHERE server_id=$1 AND inviter_id=$2', [serverId, inviterId]
  )
  if (existing) return {
    id: existing.id, code: existing.code, serverId: existing.server_id,
    inviterId: existing.inviter_id, uses: existing.uses, maxUses: existing.max_uses,
    expiresAt: existing.expires_at, createdAt: existing.created_at,
  }

  const code = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  const id = generateId('inv_')
  const { rows: [invite] } = await pool.query(
    `INSERT INTO invites (id, code, server_id, inviter_id, uses, created_at)
     VALUES ($1,$2,$3,$4,0,NOW()) RETURNING *`,
    [id, code, serverId, inviterId]
  )
  return { id: invite.id, code: invite.code, serverId: invite.server_id, inviterId: invite.inviter_id, uses: invite.uses, maxUses: invite.max_uses, expiresAt: invite.expires_at, createdAt: invite.created_at }
}

export async function getServerInvites(serverId, userId) {
  const { rows: [server] } = await pool.query('SELECT * FROM servers WHERE id=$1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  const { rows: [member] } = await pool.query(
    'SELECT 1 FROM server_members WHERE server_id=$1 AND user_id=$2', [serverId, userId]
  )
  if (!member) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows } = await pool.query('SELECT * FROM invites WHERE server_id=$1', [serverId])
  return rows.map(i => ({ id: i.id, code: i.code, serverId: i.server_id, inviterId: i.inviter_id, uses: i.uses, maxUses: i.max_uses, expiresAt: i.expires_at, createdAt: i.created_at }))
}

export async function useInvite(code, userId) {
  const { rows: [invite] } = await pool.query('SELECT * FROM invites WHERE code=$1', [code])
  if (!invite) throw Object.assign(new Error('Invalid invite code'), { status: 404 })
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    throw Object.assign(new Error('Invite expired'), { status: 410 })
  if (invite.max_uses && invite.uses >= invite.max_uses)
    throw Object.assign(new Error('Invite has reached max uses'), { status: 410 })

  const { rows: [member] } = await pool.query(
    'SELECT 1 FROM server_members WHERE server_id=$1 AND user_id=$2', [invite.server_id, userId]
  )
  if (!member) {
    await pool.query('INSERT INTO server_members (server_id, user_id) VALUES ($1,$2)', [invite.server_id, userId])
    const { rows: [defaultRole] } = await pool.query(
      'SELECT id FROM roles WHERE server_id=$1 AND is_default=true', [invite.server_id]
    )
    if (defaultRole) {
      await pool.query(
        'INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [invite.server_id, userId, defaultRole.id]
      )
    }
    await pool.query('UPDATE invites SET uses=uses+1 WHERE code=$1', [code])
  }
  return getServerWithChannels(invite.server_id, userId)
}

export async function deleteInvite(code, userId) {
  const { rows: [invite] } = await pool.query('SELECT * FROM invites WHERE code=$1', [code])
  if (!invite) throw Object.assign(new Error('Invite not found'), { status: 404 })
  const { rows: [server] } = await pool.query('SELECT owner_id FROM servers WHERE id=$1', [invite.server_id])
  if (server?.owner_id !== userId && invite.inviter_id !== userId)
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  await pool.query('DELETE FROM invites WHERE code=$1', [code])
}

// ─── Messages ────────────────────────────────────────────────────────────────

function shapeReactions(raw) {
  if (!raw) return {}
  // raw is already a JS object from pg jsonb parsing
  const out = {}
  for (const [emoji, val] of Object.entries(raw)) {
    out[emoji] = { count: Number(val.count), userIds: val.userIds ?? [] }
  }
  return out
}

function shapeMessage(m) {
  return {
    id: m.id, channelId: m.channel_id, authorId: m.author_id,
    author: m.author, displayName: m.display_name,
    avatarUrl: m.avatar_url, avatarColor: m.avatar_color,
    discriminator: m.discriminator, content: m.content,
    timestamp: m.timestamp, edited: m.edited, editedAt: m.edited_at,
    parentId: m.parent_id ?? null,
    replyCount: Number(m.reply_count ?? 0),
    reactions: shapeReactions(m.reactions),
  }
}

export async function getMessages(channelId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT m.*,
       (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) AS reply_count,
       COALESCE(
         (
           SELECT jsonb_object_agg(emoji, jsonb_build_object('count', cnt, 'userIds', user_ids))
           FROM (
             SELECT emoji, COUNT(*) AS cnt, array_agg(user_id::text) AS user_ids
             FROM message_reactions WHERE message_id = m.id GROUP BY emoji
           ) sub
         ), '{}'::jsonb
       ) AS reactions
     FROM messages m
     WHERE m.channel_id = $1 AND m.parent_id IS NULL
     ORDER BY m.timestamp ASC
     LIMIT $2`,
    [channelId, limit]
  )
  return rows.map(shapeMessage)
}

export async function createMessage({ channelId, userId, content, parentId = null }) {
  const { rows: [channel] } = await pool.query('SELECT * FROM channels WHERE id=$1', [channelId])
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 })
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id=$1', [userId])

  const id = generateId('msg_')
  const { rows: [msg] } = await pool.query(
    `INSERT INTO messages (id, channel_id, author_id, author, display_name, avatar_url, avatar_color, discriminator, content, timestamp, edited, parent_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),false,$10) RETURNING *`,
    [id, channelId, userId, user?.username ?? 'Unknown', user?.display_name ?? null,
     user?.avatar_url ?? null, user?.avatar_color ?? null,
     user?.discriminator ?? '0000', sanitize(content, 2000), parentId ?? null]
  )
  return shapeMessage({ ...msg, reply_count: 0, reactions: {} })
}

export async function getThread(parentId) {
  const { rows: [parent] } = await pool.query(
    `SELECT m.*,
       (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) AS reply_count,
       COALESCE(
         (SELECT jsonb_object_agg(emoji, jsonb_build_object('count', cnt, 'userIds', user_ids))
          FROM (SELECT emoji, COUNT(*) AS cnt, array_agg(user_id::text) AS user_ids
                FROM message_reactions WHERE message_id = m.id GROUP BY emoji) sub
         ), '{}'::jsonb
       ) AS reactions
     FROM messages m WHERE m.id = $1`, [parentId]
  )
  if (!parent) throw Object.assign(new Error('Message not found'), { status: 404 })

  const { rows: replies } = await pool.query(
    `SELECT m.*,
       0 AS reply_count,
       COALESCE(
         (SELECT jsonb_object_agg(emoji, jsonb_build_object('count', cnt, 'userIds', user_ids))
          FROM (SELECT emoji, COUNT(*) AS cnt, array_agg(user_id::text) AS user_ids
                FROM message_reactions WHERE message_id = m.id GROUP BY emoji) sub
         ), '{}'::jsonb
       ) AS reactions
     FROM messages m WHERE m.parent_id = $1 ORDER BY m.timestamp ASC`, [parentId]
  )
  return { parent: shapeMessage(parent), replies: replies.map(shapeMessage) }
}

export async function editMessage(msgId, userId, content) {
  const { rows: [msg] } = await pool.query('SELECT * FROM messages WHERE id=$1', [msgId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  if (msg.author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [updated] } = await pool.query(
    `UPDATE messages SET content=$1, edited=true, edited_at=NOW() WHERE id=$2 RETURNING *`,
    [sanitize(content, 2000), msgId]
  )
  return {
    id: updated.id, channelId: updated.channel_id, authorId: updated.author_id,
    author: updated.author, displayName: updated.display_name,
    avatarUrl: updated.avatar_url, avatarColor: updated.avatar_color,
    discriminator: updated.discriminator, content: updated.content,
    timestamp: updated.timestamp, edited: updated.edited, editedAt: updated.edited_at,
  }
}

export async function deleteMessage(msgId, userId) {
  const { rows: [msg] } = await pool.query('SELECT * FROM messages WHERE id=$1', [msgId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  if (msg.author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  await pool.query('DELETE FROM messages WHERE id=$1', [msgId])
  return { channelId: msg.channel_id }
}

// ─── Reactions ────────────────────────────────────────────────────────────────

async function getReactionsForMessage(msgId) {
  const { rows } = await pool.query(
    `SELECT emoji, COUNT(*) AS cnt, array_agg(user_id::text) AS user_ids
     FROM message_reactions WHERE message_id=$1 GROUP BY emoji`,
    [msgId]
  )
  const out = {}
  for (const r of rows) {
    out[r.emoji] = { count: Number(r.cnt), userIds: r.user_ids }
  }
  return out
}

export async function toggleReaction(msgId, userId, emoji) {
  // Validate: only allow actual emojis (unicode, up to 8 chars grapheme cluster)
  if (!emoji || emoji.length > 12) throw Object.assign(new Error('Invalid emoji'), { status: 400 })

  const { rows: [msg] } = await pool.query('SELECT channel_id FROM messages WHERE id=$1', [msgId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })

  const { rows: [existing] } = await pool.query(
    'SELECT 1 FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
    [msgId, userId, emoji]
  )

  if (existing) {
    await pool.query(
      'DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
      [msgId, userId, emoji]
    )
  } else {
    await pool.query(
      'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [msgId, userId, emoji]
    )
  }

  const reactions = await getReactionsForMessage(msgId)
  return { messageId: msgId, channelId: msg.channel_id, reactions }
}

// ─── Pins ─────────────────────────────────────────────────────────────────────

export async function getPinnedMessages(channelId) {
  const { rows } = await pool.query(
    `SELECT m.*,
       0 AS reply_count,
       COALESCE(
         (SELECT jsonb_object_agg(emoji, jsonb_build_object('count', cnt, 'userIds', user_ids))
          FROM (SELECT emoji, COUNT(*) AS cnt, array_agg(user_id::text) AS user_ids
                FROM message_reactions WHERE message_id = m.id GROUP BY emoji) sub
         ), '{}'::jsonb
       ) AS reactions
     FROM messages m
     WHERE m.channel_id = $1 AND m.is_pinned = true
     ORDER BY m.pinned_at DESC`,
    [channelId]
  )
  return rows.map(m => ({ ...shapeMessage(m), isPinned: true, pinnedAt: m.pinned_at, pinnedBy: m.pinned_by }))
}

export async function pinMessage(channelId, msgId, userId) {
  const { rows: [msg] } = await pool.query('SELECT * FROM messages WHERE id=$1 AND channel_id=$2', [msgId, channelId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  const { rows: [u] } = await pool.query('SELECT username FROM users WHERE id=$1', [userId])
  const { rows: [updated] } = await pool.query(
    'UPDATE messages SET is_pinned=true, pinned_at=NOW(), pinned_by=$1 WHERE id=$2 RETURNING *',
    [u?.username ?? 'Unknown', msgId]
  )
  return { ...shapeMessage({ ...updated, reply_count: 0, reactions: {} }), isPinned: true }
}

export async function unpinMessage(channelId, msgId, userId) {
  const { rows: [msg] } = await pool.query('SELECT * FROM messages WHERE id=$1 AND channel_id=$2', [msgId, channelId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  await pool.query('UPDATE messages SET is_pinned=false, pinned_at=NULL, pinned_by=NULL WHERE id=$1', [msgId])
  return { ok: true }
}

// ─── Channel topic ─────────────────────────────────────────────────────────────

export async function updateChannelTopic(channelId, userId, topic) {
  const { rows: [ch] } = await pool.query('SELECT * FROM channels WHERE id=$1', [channelId])
  if (!ch) throw Object.assign(new Error('Channel not found'), { status: 404 })
  const { rows: [member] } = await pool.query(
    'SELECT sm.user_id, s.owner_id FROM server_members sm JOIN servers s ON s.id=sm.server_id WHERE sm.server_id=$1 AND sm.user_id=$2',
    [ch.server_id, userId]
  )
  if (!member) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [updated] } = await pool.query(
    'UPDATE channels SET topic=$1 WHERE id=$2 RETURNING *',
    [topic ? sanitize(topic, 500) : null, channelId]
  )
  return { id: updated.id, name: updated.name, topic: updated.topic }
}

// ─── Direct Messages ──────────────────────────────────────────────────────────

export async function findUserByUsername(username) {
  const parts = username.split('#')
  const uname = parts[0].trim()
  const disc = parts[1]?.trim()
  if (disc) {
    const { rows } = await pool.query(
      'SELECT id, username, discriminator, display_name, avatar_url, avatar_color FROM users WHERE lower(username) = lower($1) AND discriminator = $2',
      [uname, disc]
    )
    return rows[0] ?? null
  }
  const { rows } = await pool.query(
    'SELECT id, username, discriminator, display_name, avatar_url, avatar_color FROM users WHERE lower(username) = lower($1)',
    [uname]
  )
  return rows[0] ?? null
}

function shapeDmMessage(m) {
  return {
    id: m.id,
    dmChannelId: m.dm_channel_id,
    authorId: m.author_id,
    author: m.username,
    displayName: m.display_name,
    avatarUrl: m.avatar_url,
    avatarColor: m.avatar_color,
    content: m.content,
    edited: m.edited,
    editedAt: m.edited_at,
    timestamp: m.created_at,
  }
}

async function getDmChannel(dmId, myId) {
  const { rows: participants } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.discriminator, u.avatar_url, u.avatar_color, u.status
     FROM dm_participants dp
     JOIN users u ON u.id = dp.user_id
     WHERE dp.dm_channel_id = $1`,
    [dmId]
  )
  const other = participants.find(p => p.id !== myId) ?? participants[0]
  const { rows: [lastRow] } = await pool.query(
    `SELECT dm.*, u.username, u.display_name, u.avatar_url, u.avatar_color
     FROM dm_messages dm JOIN users u ON u.id = dm.author_id
     WHERE dm.dm_channel_id = $1 ORDER BY dm.created_at DESC LIMIT 1`,
    [dmId]
  )
  return {
    id: dmId,
    other: other ? publicUser(other) : null,
    lastMessage: lastRow ? shapeDmMessage(lastRow) : null,
  }
}

export async function openDm(myId, targetId) {
  if (myId === targetId) throw Object.assign(new Error('Cannot DM yourself'), { status: 400 })
  const { rows: [target] } = await pool.query('SELECT id FROM users WHERE id = $1', [targetId])
  if (!target) throw Object.assign(new Error('User not found'), { status: 404 })
  const { rows: [existing] } = await pool.query(
    `SELECT dc.id FROM dm_channels dc
     JOIN dm_participants dp1 ON dp1.dm_channel_id = dc.id AND dp1.user_id = $1
     JOIN dm_participants dp2 ON dp2.dm_channel_id = dc.id AND dp2.user_id = $2`,
    [myId, targetId]
  )
  if (existing) return getDmChannel(existing.id, myId)
  const id = generateId('dm_')
  await pool.query('INSERT INTO dm_channels (id, created_at) VALUES ($1, NOW())', [id])
  await pool.query(
    'INSERT INTO dm_participants (dm_channel_id, user_id) VALUES ($1, $2), ($1, $3)',
    [id, myId, targetId]
  )
  return getDmChannel(id, myId)
}

export async function getDmChannels(userId) {
  const { rows } = await pool.query(
    `SELECT dc.id FROM dm_channels dc
     JOIN dm_participants dp ON dp.dm_channel_id = dc.id AND dp.user_id = $1
     ORDER BY dc.created_at DESC`,
    [userId]
  )
  return Promise.all(rows.map(r => getDmChannel(r.id, userId)))
}

export async function getDmMessages(dmId, userId, limit = 50) {
  const { rows: [member] } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE dm_channel_id = $1 AND user_id = $2', [dmId, userId]
  )
  if (!member) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows } = await pool.query(
    `SELECT dm.*, u.username, u.display_name, u.avatar_url, u.avatar_color
     FROM dm_messages dm JOIN users u ON u.id = dm.author_id
     WHERE dm.dm_channel_id = $1 ORDER BY dm.created_at ASC LIMIT $2`,
    [dmId, limit]
  )
  return rows.map(shapeDmMessage)
}

export async function sendDmMessage(dmId, userId, content) {
  const { rows: [member] } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE dm_channel_id = $1 AND user_id = $2', [dmId, userId]
  )
  if (!member) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
  const id = generateId('dmsg_')
  const { rows: [msg] } = await pool.query(
    `INSERT INTO dm_messages (id, dm_channel_id, author_id, content, edited, created_at)
     VALUES ($1,$2,$3,$4,false,NOW()) RETURNING *`,
    [id, dmId, userId, sanitize(content, 2000)]
  )
  return shapeDmMessage({ ...msg, username: user.username, display_name: user.display_name, avatar_url: user.avatar_url, avatar_color: user.avatar_color })
}

export async function editDmMessage(msgId, userId, content) {
  const { rows: [msg] } = await pool.query('SELECT * FROM dm_messages WHERE id = $1', [msgId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  if (msg.author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
  const { rows: [updated] } = await pool.query(
    'UPDATE dm_messages SET content=$1, edited=true, edited_at=NOW() WHERE id=$2 RETURNING *',
    [sanitize(content, 2000), msgId]
  )
  return shapeDmMessage({ ...updated, username: user.username, display_name: user.display_name, avatar_url: user.avatar_url, avatar_color: user.avatar_color })
}

export async function deleteDmMessage(msgId, userId) {
  const { rows: [msg] } = await pool.query('SELECT * FROM dm_messages WHERE id = $1', [msgId])
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  if (msg.author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  await pool.query('DELETE FROM dm_messages WHERE id = $1', [msgId])
  return { dmChannelId: msg.dm_channel_id }
}

// ─── Unread Tracking ──────────────────────────────────────────────────────────

export async function markChannelRead(userId, channelId) {
  await pool.query(
    `INSERT INTO channel_reads (user_id, channel_id, last_read_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = NOW()`,
    [userId, channelId]
  )
}

export async function markDmRead(userId, dmChannelId) {
  await pool.query(
    `INSERT INTO dm_reads (user_id, dm_channel_id, last_read_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (user_id, dm_channel_id) DO UPDATE SET last_read_at = NOW()`,
    [userId, dmChannelId]
  )
}

export async function getUnreadCounts(userId) {
  const { rows: chRows } = await pool.query(
    `SELECT m.channel_id, COUNT(*) AS cnt
     FROM messages m
     LEFT JOIN channel_reads cr ON cr.channel_id = m.channel_id AND cr.user_id = $1
     WHERE m.parent_id IS NULL
       AND m.author_id != $1
       AND (cr.last_read_at IS NULL OR m.timestamp > cr.last_read_at)
       AND m.channel_id IN (
         SELECT c.id FROM channels c
         JOIN server_members sm ON sm.server_id = c.server_id AND sm.user_id = $1
       )
     GROUP BY m.channel_id`,
    [userId]
  )
  const { rows: dmRows } = await pool.query(
    `SELECT dm.dm_channel_id, COUNT(*) AS cnt
     FROM dm_messages dm
     LEFT JOIN dm_reads dr ON dr.dm_channel_id = dm.dm_channel_id AND dr.user_id = $1
     WHERE dm.author_id != $1
       AND (dr.last_read_at IS NULL OR dm.created_at > dr.last_read_at)
       AND dm.dm_channel_id IN (
         SELECT dp.dm_channel_id FROM dm_participants dp WHERE dp.user_id = $1
       )
     GROUP BY dm.dm_channel_id`,
    [userId]
  )
  const channels = {}
  for (const r of chRows) channels[r.channel_id] = Number(r.cnt)
  const dms = {}
  for (const r of dmRows) dms[r.dm_channel_id] = Number(r.cnt)
  return { channels, dms }
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, email_verified FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  )
  return rows[0] ?? null
}

export async function createPasswordReset(userId) {
  const { randomBytes } = await import('crypto')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  await pool.query(
    `INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1,$2,$3)`,
    [token, userId, expiresAt]
  )
  return token
}

export async function usePasswordReset(token, newPassword) {
  const { rows } = await pool.query(
    `SELECT * FROM password_resets WHERE token=$1 AND used=FALSE AND expires_at>NOW()`,
    [token]
  )
  if (!rows[0]) { const e = new Error('Invalid or expired reset link'); e.status = 400; throw e }
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.hash(newPassword, 12)
  await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, rows[0].user_id])
  await pool.query(`UPDATE password_resets SET used=TRUE WHERE token=$1`, [token])
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function createEmailVerification(userId) {
  const { randomBytes } = await import('crypto')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  await pool.query(`DELETE FROM email_verifications WHERE user_id=$1`, [userId])
  await pool.query(
    `INSERT INTO email_verifications (token, user_id, expires_at) VALUES ($1,$2,$3)`,
    [token, userId, expiresAt]
  )
  return token
}

export async function useEmailVerification(token) {
  const { rows } = await pool.query(
    `SELECT * FROM email_verifications WHERE token=$1 AND expires_at>NOW()`,
    [token]
  )
  if (!rows[0]) { const e = new Error('Invalid or expired verification link'); e.status = 400; throw e }
  await pool.query(`UPDATE users SET email_verified=TRUE WHERE id=$1`, [rows[0].user_id])
  await pool.query(`DELETE FROM email_verifications WHERE token=$1`, [token])
}

// ─── 2FA / TOTP ───────────────────────────────────────────────────────────────

export async function getUserWithSecurity(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  if (!rows.length) return null
  const u = rows[0]
  return {
    ...publicUser(u),
    email: u.email,
    totpSecret: u.totp_secret,
  }
}

export async function setTotpSecret(userId, secret) {
  await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, userId])
}

export async function enableTotp(userId) {
  await pool.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [userId])
}

export async function disableTotp(userId) {
  await pool.query('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [userId])
  await pool.query('DELETE FROM totp_backup_codes WHERE user_id = $1', [userId])
}

export async function createBackupCodes(userId, hashedCodes) {
  await pool.query('DELETE FROM totp_backup_codes WHERE user_id = $1', [userId])
  for (const code of hashedCodes) {
    await pool.query(
      'INSERT INTO totp_backup_codes (user_id, code_hash) VALUES ($1, $2)',
      [userId, code]
    )
  }
}

export async function verifyAndConsumeBackupCode(userId, code) {
  const { rows } = await pool.query(
    'SELECT * FROM totp_backup_codes WHERE user_id = $1 AND used = FALSE',
    [userId]
  )
  for (const row of rows) {
    const match = await bcrypt.compare(code, row.code_hash)
    if (match) {
      await pool.query('UPDATE totp_backup_codes SET used = TRUE WHERE id = $1', [row.id])
      return true
    }
  }
  return false
}

// ─── Passkeys ─────────────────────────────────────────────────────────────────

export async function getPasskeys(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM passkeys WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return rows.map(r => ({
    id: r.id,
    credentialId: r.credential_id,
    deviceName: r.device_name ?? 'Passkey',
    createdAt: r.created_at,
    lastUsed: r.last_used,
  }))
}

export async function savePasskey(userId, { credentialId, publicKey, counter, deviceName, transports }) {
  const { rows } = await pool.query(
    `INSERT INTO passkeys (user_id, credential_id, public_key, counter, device_name, transports)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [userId, credentialId, publicKey, counter, deviceName, transports]
  )
  return rows[0]
}

export async function getPasskeyByCredentialId(credentialId) {
  const { rows } = await pool.query(
    'SELECT * FROM passkeys WHERE credential_id = $1',
    [credentialId]
  )
  return rows[0] ?? null
}

export async function updatePasskeyCounter(id, counter) {
  await pool.query(
    'UPDATE passkeys SET counter = $1, last_used = NOW() WHERE id = $2',
    [counter, id]
  )
}

export async function removePasskey(userId, passkeyId) {
  const { rowCount } = await pool.query(
    'DELETE FROM passkeys WHERE id = $1 AND user_id = $2',
    [passkeyId, userId]
  )
  if (!rowCount) {
    const e = new Error('Passkey not found')
    e.status = 404
    throw e
  }
}

export async function getUserPasskeyCredentialIds(userId) {
  const { rows } = await pool.query(
    'SELECT credential_id FROM passkeys WHERE user_id = $1',
    [userId]
  )
  return rows.map(r => r.credential_id)
}

// ─── WebAuthn Challenges ──────────────────────────────────────────────────────

export async function saveChallenge(sessionKey, challenge, type, userId = null) {
  await pool.query(
    'DELETE FROM webauthn_challenges WHERE created_at < NOW() - INTERVAL \'5 minutes\''
  )
  await pool.query('DELETE FROM webauthn_challenges WHERE session_key = $1', [sessionKey])
  await pool.query(
    'INSERT INTO webauthn_challenges (session_key, challenge, type, user_id) VALUES ($1,$2,$3,$4)',
    [sessionKey, challenge, type, userId]
  )
}

export async function getAndDeleteChallenge(sessionKey) {
  const { rows } = await pool.query(
    `DELETE FROM webauthn_challenges
     WHERE session_key = $1 AND created_at > NOW() - INTERVAL '5 minutes'
     RETURNING *`,
    [sessionKey]
  )
  return rows[0] ?? null
}

// ─── Login History ─────────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    ip TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('login_history table init failed:', err.message))

export async function recordLoginHistory(userId, { method, ip, device }) {
  await pool.query(
    'INSERT INTO login_history (user_id, method, ip, device) VALUES ($1, $2, $3, $4)',
    [userId, method, ip ?? null, device ?? null]
  )
}

export async function getLoginHistory(userId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT id, method, ip, device, created_at
     FROM login_history WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  )
  return rows.map(r => ({
    id: r.id,
    method: r.method,
    ip: r.ip,
    device: r.device,
    createdAt: r.created_at,
  }))
}

// ─── Game Activity ────────────────────────────────────────────────────────────

export async function updateGameActivity(userId, game) {
  const value = (typeof game === 'string' && game.trim()) ? game.trim().slice(0, 100) : null
  await pool.query('UPDATE users SET game_activity = $1 WHERE id = $2', [value, userId])
}

// ─── Reports ─────────────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    message_id TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('reports table init failed:', err.message))

export async function createReport({ reporterId, messageId, userId, reason }) {
  const { rows } = await pool.query(
    `INSERT INTO reports (reporter_id, message_id, user_id, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING id, status, created_at`,
    [reporterId, messageId ?? null, userId ?? null, reason]
  )
  return rows[0]
}

export async function getReports({ status } = {}) {
  const { rows } = await pool.query(
    `SELECT r.*, u.username as reporter_username
     FROM reports r
     LEFT JOIN users u ON r.reporter_id = u.id
     ${status ? 'WHERE r.status = $1' : ''}
     ORDER BY r.created_at DESC LIMIT 100`,
    status ? [status] : []
  )
  return rows
}

// ─── Releases ────────────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS releases (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL DEFAULT 'windows',
    filename TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes BIGINT,
    version TEXT,
    notes TEXT,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('releases table init failed:', err.message))

export async function createRelease({ platform, filename, sha256, sizeBytes, version, notes, uploadedBy, fileData }) {
  const { rows } = await pool.query(
    `INSERT INTO releases (platform, filename, sha256, size_bytes, version, notes, uploaded_by, file_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, platform, filename, sha256, size_bytes, version, notes, uploaded_by, uploaded_at`,
    [platform, filename, sha256, sizeBytes ?? null, version ?? null, notes ?? null, uploadedBy ?? null, fileData ?? null]
  )
  return rows[0]
}

export async function getReleaseFileData(platform) {
  const { rows } = await pool.query(
    `SELECT file_data FROM releases WHERE platform = $1 AND file_data IS NOT NULL ORDER BY uploaded_at DESC LIMIT 1`,
    [platform]
  )
  return rows[0]?.file_data ?? null
}

export async function getLatestRelease(platform = 'windows') {
  const { rows } = await pool.query(
    `SELECT * FROM releases WHERE platform = $1 ORDER BY uploaded_at DESC LIMIT 1`,
    [platform]
  )
  return rows[0] ?? null
}

export async function getReleaseHistory(platform = 'windows', limit = 10) {
  const { rows } = await pool.query(
    `SELECT r.*, u.username as uploader_name
     FROM releases r
     LEFT JOIN users u ON u.id = r.uploaded_by
     WHERE r.platform = $1
     ORDER BY r.uploaded_at DESC LIMIT $2`,
    [platform, limit]
  )
  return rows
}

// ─── Change Password ──────────────────────────────────────────────────────────

export async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId])
  if (!rows[0]) { const err = new Error('User not found'); err.status = 404; throw err }
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash)
  if (!valid) { const err = new Error('Current password is incorrect'); err.status = 400; throw err }
  const hash = await bcrypt.hash(newPassword, 12)
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId])
  return { ok: true }
}

// ─── Channel Management ───────────────────────────────────────────────────────

export async function renameChannel(channelId, userId, name) {
  const { rows: ch } = await pool.query('SELECT id, server_id FROM channels WHERE id = $1', [channelId])
  if (!ch[0]) { const err = new Error('Channel not found'); err.status = 404; throw err }
  const { rows: mb } = await pool.query('SELECT is_owner FROM server_members WHERE server_id = $1 AND user_id = $2', [ch[0].server_id, userId])
  if (!mb[0]?.is_owner) { const err = new Error('Only the server owner can rename channels'); err.status = 403; throw err }
  const { rows } = await pool.query('UPDATE channels SET name = $1 WHERE id = $2 RETURNING *', [sanitize(name, 100), channelId])
  return rows[0]
}

export async function deleteChannel(channelId, userId) {
  const { rows: ch } = await pool.query('SELECT id, server_id FROM channels WHERE id = $1', [channelId])
  if (!ch[0]) { const err = new Error('Channel not found'); err.status = 404; throw err }
  const { rows: mb } = await pool.query('SELECT is_owner FROM server_members WHERE server_id = $1 AND user_id = $2', [ch[0].server_id, userId])
  if (!mb[0]?.is_owner) { const err = new Error('Only the server owner can delete channels'); err.status = 403; throw err }
  const { rows: total } = await pool.query("SELECT COUNT(*) as cnt FROM channels WHERE server_id = $1 AND type = 'text'", [ch[0].server_id])
  if (parseInt(total[0].cnt) <= 1) { const err = new Error('Cannot delete the last text channel'); err.status = 400; throw err }
  await pool.query('DELETE FROM channels WHERE id = $1', [channelId])
  return { ok: true }
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS total_users,
      (SELECT COUNT(*) FROM messages)::int AS total_messages,
      (SELECT COUNT(*) FROM servers)::int AS total_servers,
      (SELECT COUNT(*) FROM users WHERE game_activity IS NOT NULL)::int AS active_games,
      (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours')::int AS new_users_24h,
      (SELECT COUNT(*) FROM messages WHERE timestamp > NOW() - INTERVAL '24 hours')::int AS messages_24h
  `)
  return rows[0]
}

// ─── Friend Requests ─────────────────────────────────────────────────────────

export async function sendFriendRequest(fromUserId, toUsername) {
  const target = await pool.query(
    'SELECT * FROM users WHERE lower(username) = lower($1)',
    [toUsername]
  )
  if (target.rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 })
  const toUser = target.rows[0]
  if (toUser.id === fromUserId) throw Object.assign(new Error('Cannot add yourself'), { status: 400 })

  const existing = await pool.query(
    `SELECT id, status FROM friend_requests WHERE
     (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)`,
    [fromUserId, toUser.id]
  )
  if (existing.rows.length > 0) {
    const s = existing.rows[0].status
    if (s === 'accepted') throw Object.assign(new Error('Already friends'), { status: 409 })
    throw Object.assign(new Error('Friend request already sent'), { status: 409 })
  }

  const id = generateId('fr_')
  await pool.query(
    'INSERT INTO friend_requests (id, from_user_id, to_user_id, status) VALUES ($1,$2,$3,$4)',
    [id, fromUserId, toUser.id, 'pending']
  )
  return { id, toUserId: toUser.id, username: toUser.username }
}

export async function getFriendRequests(userId) {
  const { rows } = await pool.query(
    `SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at,
      u1.username as fu, u1.display_name as fdn, u1.avatar_url as fav, u1.avatar_color as fac, u1.discriminator as fdis,
      u2.username as tu, u2.display_name as tdn, u2.avatar_url as tav, u2.avatar_color as tac, u2.discriminator as tdis
     FROM friend_requests fr
     JOIN users u1 ON fr.from_user_id = u1.id
     JOIN users u2 ON fr.to_user_id = u2.id
     WHERE (fr.from_user_id = $1 OR fr.to_user_id = $1) AND fr.status = 'pending'`,
    [userId]
  )
  return rows.map(r => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    incoming: r.to_user_id === userId,
    user: r.to_user_id === userId
      ? { id: r.from_user_id, username: r.fu, displayName: r.fdn, avatarUrl: r.fav, avatarColor: r.fac, discriminator: r.fdis }
      : { id: r.to_user_id,   username: r.tu, displayName: r.tdn, avatarUrl: r.tav, avatarColor: r.tac, discriminator: r.tdis },
  }))
}

export async function acceptFriendRequest(requestId, userId) {
  const req = await pool.query('SELECT * FROM friend_requests WHERE id = $1', [requestId])
  if (!req.rows.length) throw Object.assign(new Error('Request not found'), { status: 404 })
  const r = req.rows[0]
  if (r.to_user_id !== userId) throw Object.assign(new Error('Not authorized'), { status: 403 })
  if (r.status !== 'pending') throw Object.assign(new Error('Request not pending'), { status: 400 })
  await pool.query("UPDATE friend_requests SET status='accepted' WHERE id=$1", [requestId])
  return { ok: true }
}

export async function declineFriendRequest(requestId, userId) {
  const req = await pool.query('SELECT * FROM friend_requests WHERE id = $1', [requestId])
  if (!req.rows.length) throw Object.assign(new Error('Request not found'), { status: 404 })
  const r = req.rows[0]
  if (r.to_user_id !== userId && r.from_user_id !== userId)
    throw Object.assign(new Error('Not authorized'), { status: 403 })
  await pool.query('DELETE FROM friend_requests WHERE id = $1', [requestId])
  return { ok: true }
}

export async function getFriends(userId) {
  const { rows } = await pool.query(
    `SELECT fr.id as request_id, fr.created_at,
      fr.from_user_id, fr.to_user_id,
      u1.username as fu, u1.display_name as fdn, u1.avatar_url as fav, u1.avatar_color as fac, u1.discriminator as fdis, u1.status as fst,
      u2.username as tu, u2.display_name as tdn, u2.avatar_url as tav, u2.avatar_color as tac, u2.discriminator as tdis, u2.status as tst
     FROM friend_requests fr
     JOIN users u1 ON fr.from_user_id = u1.id
     JOIN users u2 ON fr.to_user_id = u2.id
     WHERE (fr.from_user_id = $1 OR fr.to_user_id = $1) AND fr.status = 'accepted'`,
    [userId]
  )
  return rows.map(r => {
    const isSender = r.from_user_id === userId
    return {
      requestId: r.request_id,
      createdAt: r.created_at,
      user: isSender
        ? { id: r.to_user_id,   username: r.tu, displayName: r.tdn, avatarUrl: r.tav, avatarColor: r.tac, discriminator: r.tdis, status: r.tst }
        : { id: r.from_user_id, username: r.fu, displayName: r.fdn, avatarUrl: r.fav, avatarColor: r.fac, discriminator: r.fdis, status: r.fst },
    }
  })
}

export async function removeFriend(userId, friendUserId) {
  await pool.query(
    `DELETE FROM friend_requests WHERE
     ((from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1))
     AND status='accepted'`,
    [userId, friendUserId]
  )
  return { ok: true }
}
