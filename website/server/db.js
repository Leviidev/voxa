import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

// In-memory database
const db = {
  users: new Map(),
  servers: new Map(),
  members: new Map(),    // serverId -> Set of userIds
  categories: new Map(), // serverId -> [{ id, name, position }]
  channels: new Map(),   // Map<channelId, channel>
  messages: new Map(),   // channelId -> [messages]
  serverChannels: new Map(), // serverId -> [channelIds]
}

// Helpers
export const generateId = (prefix = '') => prefix + randomUUID().replace(/-/g, '').slice(0, 16)

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser({ email, username, password }) {
  const existing = [...db.users.values()].find(u => u.email === email.toLowerCase())
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 })

  const usernameTaken = [...db.users.values()].find(u => u.username.toLowerCase() === username.toLowerCase())
  if (usernameTaken) throw Object.assign(new Error('Username already taken'), { status: 409 })

  const id = generateId('u_')
  const hash = await bcrypt.hash(password, 10)
  const discriminator = String(Math.floor(1000 + Math.random() * 9000))
  const user = {
    id,
    email: email.toLowerCase(),
    username,
    discriminator,
    passwordHash: hash,
    avatar: null,
    status: 'online',
    bio: null,
    createdAt: new Date().toISOString(),
  }
  db.users.set(id, user)
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

export function publicUser(u) {
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

  const server = {
    id,
    name: name.trim(),
    icon: null,
    ownerId,
    createdAt: new Date().toISOString(),
  }
  db.servers.set(id, server)

  // Default categories + channels
  const cats = [
    { id: generalCatId, name: 'Text Channels', position: 0 },
    { id: voiceCatId, name: 'Voice Channels', position: 1 },
  ]
  db.categories.set(id, cats)

  db.channels.set(generalChId, { id: generalChId, serverId: id, categoryId: generalCatId, name: 'general', type: 'text', position: 0, createdAt: new Date().toISOString() })
  db.channels.set(voiceChId, { id: voiceChId, serverId: id, categoryId: voiceCatId, name: 'General', type: 'voice', position: 0, createdAt: new Date().toISOString() })
  db.serverChannels.set(id, [generalChId, voiceChId])
  db.messages.set(generalChId, [])

  // Add owner as member
  const memberSet = new Set([ownerId])
  db.members.set(id, memberSet)

  return getServerWithChannels(id, ownerId)
}

export function getServerWithChannels(serverId, userId) {
  const server = db.servers.get(serverId)
  if (!server) return null
  const memberIds = db.members.get(serverId) ?? new Set()
  if (!memberIds.has(userId)) return null

  const cats = db.categories.get(serverId) ?? []
  const channelIds = db.serverChannels.get(serverId) ?? []

  const categories = cats.map(cat => {
    const channels = channelIds
      .map(cid => db.channels.get(cid))
      .filter(c => c && c.categoryId === cat.id)
      .map(c => ({ id: c.id, name: c.name, type: c.type, position: c.position }))
      .sort((a, b) => a.position - b.position)
    return { id: cat.id, name: cat.name, channels }
  }).sort((a, b) => a.position - b.position)

  const members = [...memberIds].map(uid => {
    const u = db.users.get(uid)
    if (!u) return null
    return { id: u.id, username: u.username, discriminator: u.discriminator, avatar: u.avatar, status: u.status, role: u.id === server.ownerId ? 'Admin' : 'Member' }
  }).filter(Boolean)

  return { ...server, categories, members }
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
  const channelIds = db.serverChannels.get(serverId) ?? []
  channelIds.forEach(cid => { db.channels.delete(cid); db.messages.delete(cid) })
  db.serverChannels.delete(serverId)
}

// ─── Channels ────────────────────────────────────────────────────────────────

export function createChannel({ serverId, name, type, userId }) {
  const server = db.servers.get(serverId)
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })

  const cats = db.categories.get(serverId) ?? []
  const targetCat = cats.find(c => c.name === (type === 'voice' ? 'Voice Channels' : 'Text Channels')) ?? cats[0]

  const id = generateId(type === 'voice' ? 'vc_' : 'ch_')
  const existingInCat = (db.serverChannels.get(serverId) ?? [])
    .map(cid => db.channels.get(cid))
    .filter(c => c && c.categoryId === targetCat?.id).length

  const channel = {
    id,
    serverId,
    categoryId: targetCat?.id,
    name: name.trim().toLowerCase().replace(/\s+/g, '-'),
    type,
    position: existingInCat,
    createdAt: new Date().toISOString(),
  }
  db.channels.set(id, channel)
  const cids = db.serverChannels.get(serverId) ?? []
  db.serverChannels.set(serverId, [...cids, id])
  if (type === 'text') db.messages.set(id, [])
  return { id: channel.id, name: channel.name, type: channel.type }
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function getMessages(channelId, limit = 50) {
  const msgs = db.messages.get(channelId) ?? []
  return msgs.slice(-limit)
}

export function createMessage({ channelId, userId, content }) {
  const channel = db.channels.get(channelId)
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 })

  const user = db.users.get(userId)
  const msgs = db.messages.get(channelId) ?? []
  const msg = {
    id: generateId('msg_'),
    channelId,
    authorId: userId,
    author: user?.username ?? 'Unknown',
    discriminator: user?.discriminator ?? '0000',
    content: content.trim(),
    timestamp: new Date().toISOString(),
    edited: false,
    editedAt: null,
  }
  msgs.push(msg)
  db.messages.set(channelId, msgs)
  return msg
}

export function editMessage(msgId, userId, content) {
  for (const [channelId, msgs] of db.messages) {
    const idx = msgs.findIndex(m => m.id === msgId)
    if (idx === -1) continue
    if (msgs[idx].authorId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
    msgs[idx] = { ...msgs[idx], content: content.trim(), edited: true, editedAt: new Date().toISOString() }
    db.messages.set(channelId, msgs)
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
    return
  }
  throw Object.assign(new Error('Message not found'), { status: 404 })
}
