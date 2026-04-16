import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Typed API helpers ─────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
};

export const conversationsApi = {
  list:    (params?: any) => api.get('/conversations', { params }),
  assign:  (id: string, agentId: string) => api.patch(`/conversations/${id}/assign`, { agentId }),
  resolve: (id: string) => api.patch(`/conversations/${id}/resolve`),
  reopen:  (id: string) => api.patch(`/conversations/${id}/reopen`),
};

export const messagesApi = {
  list:         (conversationId: string, page = 1) => api.get('/messages', { params: { conversationId, page } }),
  sendText:     (data: any) => api.post('/messages/text', data),
  sendTemplate: (data: any) => api.post('/messages/template', data),
};

export const contactsApi = {
  list:      (params?: any)            => api.get('/contacts', { params }),
  findOne:   (id: string)              => api.get(`/contacts/${id}`),
  create:    (data: any)               => api.post('/contacts', data),
  update:    (id: string, data: any)   => api.patch(`/contacts/${id}`, data),
  addTag:    (id: string, tag: string) => api.post(`/contacts/${id}/tags`, { tag }),
  removeTag: (id: string, tag: string) => api.delete(`/contacts/${id}/tags/${tag}`),
  delete:    (id: string)              => api.delete(`/contacts/${id}`),
  allTags:   ()                        => api.get('/contacts/tags'),
};

export const campaignsApi = {
  list:     ()                         => api.get('/campaigns'),
  findOne:  (id: string)               => api.get(`/campaigns/${id}`),
  create:   (data: any)                => api.post('/campaigns', data),
  update:   (id: string, data: any)    => api.patch(`/campaigns/${id}`, data),
  launch:   (id: string)               => api.post(`/campaigns/${id}/launch`),
  pause:    (id: string)               => api.post(`/campaigns/${id}/pause`),
  delete:   (id: string)               => api.delete(`/campaigns/${id}`),
};

export const automationsApi = {
  list:     ()                         => api.get('/automations'),
  findOne:  (id: string)               => api.get(`/automations/${id}`),
  create:   (data: any)                => api.post('/automations', data),
  update:   (id: string, data: any)    => api.patch(`/automations/${id}`, data),
  toggle:   (id: string)               => api.patch(`/automations/${id}/toggle`),
  delete:   (id: string)               => api.delete(`/automations/${id}`),
  logs:     (id: string)               => api.get(`/automations/${id}/logs`),
};

export const businessApi = {
  me:              ()       => api.get('/businesses/me'),
  stats:           ()       => api.get('/businesses/me/stats'),
  updateWhatsApp:  (d: any) => api.patch('/businesses/me/whatsapp', d),
};
