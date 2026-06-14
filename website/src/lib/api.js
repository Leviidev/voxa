const BASE = '/api'

function getToken() {
  return localStorage.getItem('voxa_token')
}

async function request(path, options = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach the server. Please try again.')
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('Server is starting up — please try again in a moment.')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password }) }),
  me: () => request('/auth/me'),

  // Users / Profile
  updateProfile: (fields) =>
    request('/users/me', { method: 'PATCH', body: JSON.stringify(fields) }),
  getUser: (id) => request(`/users/${id}`),

  // Servers
  getServers: () => request('/servers'),
  createServer: (name) => request('/servers', { method: 'POST', body: JSON.stringify({ name }) }),
  getServer: (id) => request(`/servers/${id}`),
  updateServer: (id, fields) =>
    request(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  deleteServer: (id) => request(`/servers/${id}`, { method: 'DELETE' }),
  leaveServer: (id) => request(`/servers/${id}/leave`, { method: 'POST' }),
  discoverServers: (q = '') => request(`/servers/discover?q=${encodeURIComponent(q)}`),
  joinPublicServer: (id) => request(`/servers/${id}/join-public`, { method: 'POST' }),

  // Members
  kickMember: (serverId, userId) =>
    request(`/servers/${serverId}/members/${userId}`, { method: 'DELETE' }),

  // Roles
  getRoles: (serverId) => request(`/servers/${serverId}/roles`),
  createRole: (serverId, data) =>
    request(`/servers/${serverId}/roles`, { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (serverId, roleId, data) =>
    request(`/servers/${serverId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRole: (serverId, roleId) =>
    request(`/servers/${serverId}/roles/${roleId}`, { method: 'DELETE' }),
  assignRole: (serverId, userId, roleId) =>
    request(`/servers/${serverId}/members/${userId}/roles/${roleId}`, { method: 'PUT' }),
  removeRole: (serverId, userId, roleId) =>
    request(`/servers/${serverId}/members/${userId}/roles/${roleId}`, { method: 'DELETE' }),

  // Invites
  getInvites: (serverId) => request(`/servers/${serverId}/invites`),
  createInvite: (serverId) =>
    request(`/servers/${serverId}/invites`, { method: 'POST' }),
  deleteInvite: (serverId, code) =>
    request(`/servers/${serverId}/invites/${code}`, { method: 'DELETE' }),
  joinByInvite: (code) =>
    request(`/invites/${code}/join`, { method: 'POST' }),

  // Channels
  createChannel: (serverId, name, type) =>
    request(`/channels/servers/${serverId}/channels`, { method: 'POST', body: JSON.stringify({ name, type }) }),
  updateChannelTopic: (channelId, topic) =>
    request(`/channels/${channelId}/topic`, { method: 'PATCH', body: JSON.stringify({ topic }) }),
  renameChannel: (channelId, name) =>
    request(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteChannel: (channelId) =>
    request(`/channels/${channelId}`, { method: 'DELETE' }),

  // Pins
  getPins: (channelId) => request(`/channels/${channelId}/pins`),
  pinMessage: (channelId, msgId) => request(`/channels/${channelId}/pins/${msgId}`, { method: 'PUT' }),
  unpinMessage: (channelId, msgId) => request(`/channels/${channelId}/pins/${msgId}`, { method: 'DELETE' }),

  // Messages
  getMessages: (channelId, limit = 50) =>
    request(`/messages/channels/${channelId}/messages?limit=${limit}`),
  sendMessage: (channelId, content) =>
    request(`/messages/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  editMessage: (id, content) =>
    request(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteMessage: (id) =>
    request(`/messages/${id}`, { method: 'DELETE' }),
  toggleReaction: (msgId, emoji) =>
    request(`/messages/${msgId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),

  // Threads
  getThread: (msgId) => request(`/messages/${msgId}/thread`),
  postReply: (msgId, content) =>
    request(`/messages/${msgId}/replies`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Auth extras
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  verifyEmail: (token) =>
    request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: () =>
    request('/auth/resend-verification', { method: 'POST' }),

  // 2FA / TOTP
  get2FAStatus: () => request('/auth/2fa/status'),
  setup2FA: () => request('/auth/2fa/setup', { method: 'POST' }),
  enable2FA: (code) => request('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),
  disable2FA: (code) => request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
  verify2FA: (tempToken, code) =>
    request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ tempToken, code }) }),

  // Passkeys
  listPasskeys: () => request('/auth/passkey/list'),
  passkeyRegisterOptions: () => request('/auth/passkey/register-options', { method: 'POST' }),
  passkeyRegister: (sessionKey, response, deviceName) =>
    request('/auth/passkey/register', { method: 'POST', body: JSON.stringify({ sessionKey, response, deviceName }) }),
  passkeyAuthOptions: () => request('/auth/passkey/authenticate-options', { method: 'POST' }),
  passkeyAuthenticate: (sessionKey, response) =>
    request('/auth/passkey/authenticate', { method: 'POST', body: JSON.stringify({ sessionKey, response }) }),
  deletePasskey: (id) => request(`/auth/passkey/${id}`, { method: 'DELETE' }),
  getLoginHistory: () => request('/auth/login-history'),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Unread
  getUnread: () => request('/unread'),
  markChannelRead: (channelId) => request(`/channels/${channelId}/read`, { method: 'POST' }),
  markDmRead: (dmId) => request(`/dms/${dmId}/read`, { method: 'POST' }),

  // Direct Messages
  getDms: () => request('/dms'),
  openDm: (userId, username) =>
    request('/dms', { method: 'POST', body: JSON.stringify({ userId, username }) }),
  getDmMessages: (dmId, limit = 50) => request(`/dms/${dmId}/messages?limit=${limit}`),
  sendDmMessage: (dmId, content) =>
    request(`/dms/${dmId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  editDmMessage: (dmId, msgId, content) =>
    request(`/dms/${dmId}/messages/${msgId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteDmMessage: (dmId, msgId) =>
    request(`/dms/${dmId}/messages/${msgId}`, { method: 'DELETE' }),

  // Friends
  sendFriendRequest: (username) =>
    request('/friends/request', { method: 'POST', body: JSON.stringify({ username }) }),
  getFriendRequests: () => request('/friends/requests'),
  acceptFriendRequest: (id) =>
    request(`/friends/requests/${id}/accept`, { method: 'POST' }),
  declineFriendRequest: (id) =>
    request(`/friends/requests/${id}`, { method: 'DELETE' }),
  getFriends: () => request('/friends'),
  removeFriend: (userId) =>
    request(`/friends/${userId}`, { method: 'DELETE' }),
}
