// Production-Ready Dynamic API Base
// 1. Agar .env mein VITE_API_URL set hai toh wo use hoga
// 2. Local development par http://localhost:5001 use hoga (jo server chal raha hai)
// 3. Live server par automatically relative domain (/api/v1) use hoga
const ENV_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const API_BASE = ENV_URL 
  ? (ENV_URL.endsWith('/api/v1') ? ENV_URL : `${ENV_URL}/api/v1`)
  : (IS_LOCAL ? 'http://localhost:5001/api/v1' : '/api/v1')

const ROOT_URL = API_BASE.replace(/\/api\/v1\/?$/, '')

async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_BASE}${cleanEndpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body)
  }

  try {
    const response = await fetch(url, config)
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      const message = errorBody?.error?.message || `Request failed with status ${response.status}`
      throw new Error(message)
    }
    if (response.status === 204) return null
    const result = await response.json()
    return result.data !== undefined ? result.data : result
  } catch (err) {
    console.warn(`[API] Error on ${options.method || 'GET'} ${endpoint}:`, err.message)
    throw err
  }
}

export const api = {
  // Health
  checkHealth: () => fetch(`${ROOT_URL}/health`).then((r) => r.json()).catch(() => null),

  // Tickets
  getTickets: (query = '') => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return request(`/tickets${queryString}`)
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: data }),
  updateTicket: (id, changes) => request(`/tickets/${id}`, { method: 'PATCH', body: changes }),
  deleteTicket: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),
  addComment: (id, { body, visibility = 'public' }) => request(`/tickets/${id}/comments`, { method: 'POST', body: { body, visibility } }),
  getTicketActivity: (id) => request(`/tickets/${id}/activity`),
  uploadAttachment: (ticketId, { fileName, sizeBytes, contentType }) => request(`/tickets/${ticketId}/attachments`, { method: 'POST', body: { fileName, sizeBytes, contentType } }),

  // Customers
  getCustomers: () => request('/customers'),
  createCustomer: (data) => request('/customers', { method: 'POST', body: data }),

  // Agents
  getAgents: () => request('/agents'),
  createAgent: (data) => request('/agents', { method: 'POST', body: data }),
  updateAgent: (id, data) => request(`/agents/${id}`, { method: 'PATCH', body: data }),
  deleteAgent: (id) => request(`/agents/${id}`, { method: 'DELETE' }),

  // Teams
  getTeams: () => request('/teams'),
  createTeam: (data) => request('/teams', { method: 'POST', body: data }),
  updateTeam: (id, data) => request(`/teams/${id}`, { method: 'PATCH', body: data }),
  deleteTeam: (id) => request(`/teams/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => request('/departments'),
  createDepartment: (data) => request('/departments', { method: 'POST', body: data }),
  updateDepartment: (id, data) => request(`/departments/${id}`, { method: 'PATCH', body: data }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),

  // Knowledge Base Articles
  getArticles: (search = '') => request(`/articles${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createArticle: (data) => request('/articles', { method: 'POST', body: data }),
  updateArticle: (id, data) => request(`/articles/${id}`, { method: 'PATCH', body: data }),
  deleteArticle: (id) => request(`/articles/${id}`, { method: 'DELETE' }),
  recordArticleRead: (id) => request(`/articles/${id}/read`, { method: 'POST' }),

  // Automations
  getAutomations: () => request('/automations'),
  createAutomation: (data) => request('/automations', { method: 'POST', body: data }),
  updateAutomation: (id, data) => request(`/automations/${id}`, { method: 'PATCH', body: data }),
  deleteAutomation: (id) => request(`/automations/${id}`, { method: 'DELETE' }),
  runAutomations: () => request('/automations/run', { method: 'POST' }),

  // Notifications & Activity
  getNotifications: () => request('/notifications'),
  getActivity: () => request('/activity'),
  recordActivity: (action, entity = 'Workspace') => request('/activity', { method: 'POST', body: { action, entity } }),

  // Reports
  getReportSummary: () => request('/reports/summary'),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PATCH', body: settings }),

  // Auth & Security Verification
  getCurrentUser: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  sendSecurityOtp: (email) => request('/auth/send-otp', { method: 'POST', body: { email } }),
  verifySecurityOtp: (email, code) => request('/auth/verify-otp', { method: 'POST', body: { email, code } }),
}

export default api