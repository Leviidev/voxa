import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const DB_PATH = `${__dir}/voxa_data.json`

// ─── Persistence ─────────────────────────────────────────────────────────────

function serialize(db) {
  return {
    users: Object.fromEntries(db.users),
    servers: Object.fromEntries(db.servers),
    members: Object.fromEntries([...db.members].map(([k, v]) => [k, [...v]])),
    categories: Object.fromEntries(db.categories),
    channels: Object.fromEntries(db.channels),
    messages: Object.fromEntries(db.messages),
    serverChannels: Object.fromEntries(db.serverChannels),
    roles: Object.fromEntries(db.roles),
    memberRoles: Object.fromEntries(db.memberRoles),
    invites: Object.fromEntries(db.invites),
  }
}

function deserialize(data) {
  return {
    users: new Map(Object.entries(data.users ?? {})),
    servers: new Map(Object.entries(data.servers ?? {})),
    members: new Map(Object.entries(data.members ?? {}).map(([k, v]) => [k, new Set(v)])),
    categories: new Map(Object.entries(data.categories ?? {})),
    channels: new Map(Object.entries(data.channels ?? {})),
    messages: new Map(Object.entries(data.messages ?? {})),
    serverChannels: new Map(Object.entries(data.serverChannels ?? {})),
    roles: new Map(Object.entries(data.roles ?? {})),
    memberRoles: new Map(Object.entries(data.memberRoles ?? {})),
    invites: new Map(Object.entries(data.invites ?? {})),
  }
}

function loadDb() {
  try {
    if (existsSync(DB_PATH)) return deserialize(JSON.parse(readFileSync(DB_PATH, 'utf8')))
  } catch {}
  return deserialize({})
}

let saveTimer = null
function persist() {
  // Debounce saves to avoid hammering disk
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { writeFileSync(DB_PATH, JSON.stringify(serialize(db)), 'utf8') } catch {}
  }, 300)
}

const db = loadDb()
console.log(`DB loaded — users: ${db.users.size}, servers: ${db.servers.size}`)

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const generateId = (prefix = '') => prefix + randomUUID().replace(/-/g, '').slice(0, 16)

function sanitize(str, max = 2000) {
  return String(str ?? '').replace(/<[^>]*>/g, '').trim().slice(0, max)
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser({ email, username, password }) {
  const emailLower = email.toLowerCase()
  if ([...db.users.values()].find(u => u.email === emailLower))
    throw Object.assign(new Error('Email already registered'), { status: 409 })
  if ([...db.users.values()].find(u => u.username.toLowerCase() === username.toLowerCase()))
    throw Object.assign(new Error('Username already taken'), { status: 409 })

  const id = generateId('u_')
  const user = {
    id,
    email: emailLower,
    username: sanitize(username, 32),
    discriminator: String(Math.floor(1000 + Math.random() * 9000)),
    passwordHash: await bcrypt.hash(password, 10),
    displayName: null,
    bio: null,
    customStatus: null,
    avatarUrl: null,
    avatarColor: null,
    bannerUrl: null,
    bannerColor: null,
    status: 'online',
    createdAt: new Date().toISOString(),
  }
  db.users.set(id, user)
  persist()
  return publicUser(user)
}

export async function verifyUser(email, password) {
  const user = [...db.users.values()].find(u => u.email === email.toLowerCase())
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  return publicUser(user)
}

export function getUserById(id) {
  const u = db.users.get(id)
  return u ? publicUser(u) : null
}

export function updateUser(userId, fields) {
  const user = db.users.get(userId)
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 })

  const allowed = ['displayName', 'bio', 'customStatus', 'avatarUrl', 'avatarColor', 'bannerUrl', 'bannerColor', 'status']
  const update = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key] === '' ? null : sanitize(fields[key] ?? '', 200)
  }
  // Status enum check
  if (update.status && !['online', 'idle', 'dnd', 'offline'].includes(update.status)) delete update.status

  const updated = { ...user, ...update }
  db.users.set(userId, updated)
  persist()
  return publicUser(updated)
}

export function publicUser(u) {
  const { passwordHash, email, ...rest } = u
  return rest
}

export function publicUserFull(u) {
  const { passwordHash, ...rest } = u
  return rest
}

// ─── Servers ─────────────────────────────────────────────────────────────────

export function createServer({ name, ownerId }) {
  const id = generateId('srv_')
  const generalCatId = generateId('cat_')
  const generalChId = generateId('ch_')
  const voiceCatId = generateId('cat_')
  const voiceChId = generateId('vc_')
  const everyoneRoleId = generateId('role_')

  db.servers.set(id, {
    id, name: sanitize(name, 100), iconUrl: null, iconColor: null,
    description: null, bannerUrl: null, bannerColor: null,
    ownerId, createdAt: new Date().toISOString(),
  })

  db.categories.set(id, [
    { id: generalCatId, name: 'Text Channels', position: 0 },
    { id: voiceCatId, name: 'Voice Channels', position: 1 },
  ])

  db.channels.set(generalChId, { id: generalChId, serverId: id, categoryId: generalCatId, name: 'general', type: 'text', topic: null, position: 0, createdAt: new Date().toISOString() })
  db.channels.set(voiceChId, { id: voiceChId, serverId: id, categoryId: voiceCatId, name: 'General', type: 'voice', position: 0, createdAt: new Date().toISOString() })
  db.serverChannels.set(id, [generalChId, voiceChId])
  db.messages.set(generalChId, [])

  db.members.set(id, new Set([ownerId]))

  // Default @everyone role
  db.roles.set(id, [{
    id: everyoneRoleId, name: '@everyone', color: null,
    hoist: false, position: 0, permissions: ['send_messages', 'read_messages'],
    isDefault: true, createdAt: new Date().toISOString(),
  }])
  db.memberRoles.set(`${id}_${ownerId}`, [everyoneRoleId])

  persist()
  return getServerWithChannels(id, ownerId)
}

export function getServerWithChannels(serverId, userId) {
  const server = db.servers.get(serverId)
  if (!server) return null
  const memberIds = db.members.get(serverId) ?? new Set()
  if (!memberIds.has(userId)) return null

  const cats = db.categories.get(serverId) ?? []
  const channelIds = db.serverChannels.get(serverId) ?? []
  const roles = db.roles.get(serverId) ?? []

  const categories = cats.map(cat => ({
    id: cat.id, name: cat.name,
    channels: channelIds.map(cid => db.channels.get(cid))
      .filter(c => c?.categoryId === cat.id)
      .map(c => ({ id: c.id, name: c.name, type: c.type, topic: c.topic }))
      .sort((a, b) => a.position - b.position),
  })).sort((a, b) => a.position - b.position)

  const members = [...memberIds].map(uid => {
    const u = db.users.get(uid)
    if (!u) return null
    const memberRoleIds = db.memberRoles.get(`${serverId}_${uid}`) ?? []
    const memberRoles = roles.filter(r => memberRoleIds.includes(r.id))
    return {
      id: u.id, username: u.username, displayName: u.displayName, discriminator: u.discriminator,
      avatarUrl: u.avatarUrl, avatarColor: u.avatarColor, status: u.status,
      isOwner: u.id === server.ownerId,
      roles: memberRoles.map(r => ({ id: r.id, name: r.name, color: r.color })),
    }
  }).filter(Boolean)

  return { ...server, categories, members, roles }
}

export function updateServer(serverId, userId, fields) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const allowed = ['name', 'iconUrl', 'iconColor', 'description', 'bannerUrl', 'bannerColor']
  const update = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key] === '' ? null : sanitize(fields[key] ?? '', key === 'name' ? 100 : 300)
  }
  if (update.name && !update.name.trim()) throw Object.assign(new Error('Name cannot be empty'), { status: 400 })

  const updated = { ...server, ...update }
  db.servers.set(serverId, updated)
  persist()
  return updated
}

export function getUserServers(userId) {
  const result = []
  for (const [serverId, memberSet] of db.members) {
    if (memberSet.has(userId)) {
      const s = getServerWithChannels(serverId, userId)
      if (s) result.push(s)
    }
  }
  return result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export function deleteServer(serverId, userId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  db.servers.delete(serverId)
  db.members.delete(serverId)
  db.categories.delete(serverId)
  db.roles.delete(serverId)
  const channelIds = db.serverChannels.get(serverId) ?? []
  channelIds.forEach(cid => { db.channels.delete(cid); db.messages.delete(cid) })
  db.serverChannels.delete(serverId)
  // Clean member roles
  for (const key of db.memberRoles.keys()) {
    if (key.startsWith(`${serverId}_`)) db.memberRoles.delete(key)
  }
  persist()
}

export function leaveServer(serverId, userId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId === userId) throw Object.assign(new Error('Owner cannot leave — delete server instead'), { status: 400 })
  const memberSet = db.members.get(serverId) ?? new Set()
  memberSet.delete(userId)
  db.members.set(serverId, memberSet)
  db.memberRoles.delete(`${serverId}_${userId}`)
  persist()
}

export function kickMember(serverId, requesterId, targetId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  if (targetId === requesterId) throw Object.assign(new Error('Cannot kick yourself'), { status: 400 })
  const memberSet = db.members.get(serverId) ?? new Set()
  memberSet.delete(targetId)
  db.members.set(serverId, memberSet)
  db.memberRoles.delete(`${serverId}_${targetId}`)
  persist()
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export function getRoles(serverId) {
  return db.roles.get(serverId) ?? []
}

export function createRole(serverId, requesterId, { name, color, hoist, permissions }) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const roles = db.roles.get(serverId) ?? []
  const role = {
    id: generateId('role_'), name: sanitize(name, 64), color: color ?? null,
    hoist: Boolean(hoist), position: roles.length,
    permissions: Array.isArray(permissions) ? permissions.filter(p => VALID_PERMISSIONS.includes(p)) : [],
    isDefault: false, createdAt: new Date().toISOString(),
  }
  roles.push(role)
  db.roles.set(serverId, roles)
  persist()
  return role
}

export function updateRole(serverId, requesterId, roleId, fields) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const roles = db.roles.get(serverId) ?? []
  const idx = roles.findIndex(r => r.id === roleId)
  if (idx === -1) throw Object.assign(new Error('Role not found'), { status: 404 })
  if (roles[idx].isDefault) throw Object.assign(new Error('Cannot modify @everyone'), { status: 400 })

  const updated = { ...roles[idx] }
  if (fields.name) updated.name = sanitize(fields.name, 64)
  if (fields.color !== undefined) updated.color = fields.color || null
  if (fields.hoist !== undefined) updated.hoist = Boolean(fields.hoist)
  if (Array.isArray(fields.permissions)) updated.permissions = fields.permissions.filter(p => VALID_PERMISSIONS.includes(p))

  roles[idx] = updated
  db.roles.set(serverId, roles)
  persist()
  return updated
}

export function deleteRole(serverId, requesterId, roleId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const roles = db.roles.get(serverId) ?? []
  const role = roles.find(r => r.id === roleId)
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 })
  if (role.isDefault) throw Object.assign(new Error('Cannot delete @everyone'), { status: 400 })
  db.roles.set(serverId, roles.filter(r => r.id !== roleId))
  // Remove from all members
  for (const [key, roleIds] of db.memberRoles) {
    if (key.startsWith(`${serverId}_`)) {
      db.memberRoles.set(key, roleIds.filter(r => r !== roleId))
    }
  }
  persist()
}

export function assignRole(serverId, requesterId, targetUserId, roleId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const roles = db.roles.get(serverId) ?? []
  if (!roles.find(r => r.id === roleId)) throw Object.assign(new Error('Role not found'), { status: 404 })
  const key = `${serverId}_${targetUserId}`
  const current = db.memberRoles.get(key) ?? []
  if (!current.includes(roleId)) {
    db.memberRoles.set(key, [...current, roleId])
    persist()
  }
}

export function removeRole(serverId, requesterId, targetUserId, roleId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  if (server.ownerId !== requesterId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  const roles = db.roles.get(serverId) ?? []
  const role = roles.find(r => r.id === roleId)
  if (role?.isDefault) throw Object.assign(new Error('Cannot remove @everyone'), { status: 400 })
  const key = `${serverId}_${targetUserId}`
  const current = db.memberRoles.get(key) ?? []
  db.memberRoles.set(key, current.filter(r => r !== roleId))
  persist()
}

const VALID_PERMISSIONS = [
  'administrator', 'manage_server', 'manage_roles', 'manage_channels',
  'kick_members', 'ban_members', 'manage_messages', 'send_messages', 'read_messages',
]

// ─── Channels ────────────────────────────────────────────────────────────────

export function createChannel({ serverId, name, type, userId }) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })

  const cats = db.categories.get(serverId) ?? []
  const targetCat = cats.find(c => c.name === (type === 'voice' ? 'Voice Channels' : 'Text Channels')) ?? cats[0]
  const id = generateId(type === 'voice' ? 'vc_' : 'ch_')
  const existingInCat = (db.serverChannels.get(serverId) ?? [])
    .map(cid => db.channels.get(cid)).filter(c => c?.categoryId === targetCat?.id).length

  db.channels.set(id, {
    id, serverId, categoryId: targetCat?.id,
    name: sanitize(name, 100).toLowerCase().replace(/\s+/g, '-'),
    type, topic: null, position: existingInCat, createdAt: new Date().toISOString(),
  })
  db.serverChannels.set(serverId, [...(db.serverChannels.get(serverId) ?? []), id])
  if (type === 'text') db.messages.set(id, [])
  persist()
  const ch = db.channels.get(id)
  return { id: ch.id, name: ch.name, type: ch.type }
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export function createInvite(serverId, inviterId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  const memberIds = db.members.get(serverId) ?? new Set()
  if (!memberIds.has(inviterId)) throw Object.assign(new Error('Not a member'), { status: 403 })

  // Reuse existing valid invite by same user
  const existing = [...db.invites.values()].find(i => i.serverId === serverId && i.inviterId === inviterId)
  if (existing) return existing

  const code = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  const invite = { id: generateId('inv_'), code, serverId, inviterId, uses: 0, maxUses: null, expiresAt: null, createdAt: new Date().toISOString() }
  db.invites.set(code, invite)
  persist()
  return invite
}

export function getServerInvites(serverId, userId) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
  const memberIds = db.members.get(serverId) ?? new Set()
  if (!memberIds.has(userId)) throw Object.assign(new Error('Forbidden'), { status: 403 })
  return [...db.invites.values()].filter(i => i.serverId === serverId)
}

export function useInvite(code, userId) {
  const invite = db.invites.get(code)
  if (!invite) throw Object.assign(new Error('Invalid invite code'), { status: 404 })
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
    throw Object.assign(new Error('Invite expired'), { status: 410 })
  if (invite.maxUses && invite.uses >= invite.maxUses)
    throw Object.assign(new Error('Invite has reached max uses'), { status: 410 })

  const memberSet = db.members.get(invite.serverId) ?? new Set()
  if (!memberSet.has(userId)) {
    memberSet.add(userId)
    db.members.set(invite.serverId, memberSet)
    // Give default role
    const roles = db.roles.get(invite.serverId) ?? []
    const defaultRole = roles.find(r => r.isDefault)
    if (defaultRole) {
      const key = `${invite.serverId}_${userId}`
      const current = db.memberRoles.get(key) ?? []
      db.memberRoles.set(key, [...current, defaultRole.id])
    }
    invite.uses++
    db.invites.set(code, invite)
    persist()
  }
  return getServerWithChannels(invite.serverId, userId)
}

export function deleteInvite(code, userId) {
  const invite = db.invites.get(code)
  if (!invite) throw Object.assign(new Error('Invite not found'), { status: 404 })
  const server = db.servers.get(invite.serverId)
  if (server?.ownerId !== userId && invite.inviterId !== userId)
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  db.invites.delete(code)
  persist()
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function getMessages(channelId, limit = 50) {
  return (db.messages.get(channelId) ?? []).slice(-limit)
}

export function createMessage({ channelId, userId, content }) {
  const channel = db.channels.get(channelId)
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 })
  const user = db.users.get(userId)
  const msgs = db.messages.get(channelId) ?? []
  const msg = {
    id: generateId('msg_'), channelId, authorId: userId,
    author: user?.username ?? 'Unknown',
    displayName: user?.displayName ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    avatarColor: user?.avatarColor ?? null,
    discriminator: user?.discriminator ?? '0000',
    content: sanitize(content, 2000),
    timestamp: new Date().toISOString(), edited: false, editedAt: null,
  }
  msgs.push(msg)
  db.messages.set(channelId, msgs)
  persist()
  return msg
}

export function editMessage(msgId, userId, content) {
  for (const [channelId, msgs] of db.messages) {
    const idx = msgs.findIndex(m => m.id === msgId)
    if (idx === -1) continue
    if (msgs[idx].authorId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
    msgs[idx] = { ...msgs[idx], content: sanitize(content, 2000), edited: true, editedAt: new Date().toISOString() }
    db.messages.set(channelId, msgs)
    persist()
    return msgs[idx]
  }
  throw Object.assign(new Error('Message not found'), { status: 404 })
}

export function deleteMessage(msgId, userId) {
  for (const [channelId, msgs] of db.messages) {
    const idx = msgs.findIndex(m => m.id === msgId)
    if (idx === -1) continue
    if (msgs[idx].authorId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
    msgs.splice(idx, 1)
    db.messages.set(channelId, msgs)
    persist()
    return
  }
  throw Object.assign(new Error('Message not found'), { status: 404 })
}
