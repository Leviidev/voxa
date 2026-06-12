const BASE = '/api'

function getToken() {
  return localStorage.getItem('voxa_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 204) return null
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

  // Servers
  getServers: () => request('/servers'),
  createServer: (name) => request('/servers', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteServer: (id) => request(`/servers/${id}`, { method: 'DELETE' }),

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
