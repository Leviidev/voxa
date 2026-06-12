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

  // Messages
  getMessages: (channelId, limit = 50) =>
    request(`/messages/channels/${channelId}/messages?limit=${limit}`),
  sendMessage: (channelId, content) =>
    request(`/messages/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  editMessage: (id, content) =>
    request(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteMessage: (id) =>
    request(`/messages/${id}`, { method: 'DELETE' }),
}
