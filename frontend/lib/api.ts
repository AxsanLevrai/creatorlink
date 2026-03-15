import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthTokens } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers ─────────────────────────────────────────────
export const getTokens = (): AuthTokens | null => {
  if (typeof window === 'undefined') return null;
  const access = localStorage.getItem('cl_access');
  const refresh = localStorage.getItem('cl_refresh');
  if (!access || !refresh) return null;
  return { access, refresh };
};

export const setTokens = (tokens: AuthTokens) => {
  localStorage.setItem('cl_access', tokens.access);
  localStorage.setItem('cl_refresh', tokens.refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('cl_access');
  localStorage.removeItem('cl_refresh');
};

// ── Request interceptor: attach bearer token ──────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh expired tokens ────────
let isRefreshing = false;
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  queue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      const tokens = getTokens();

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh: tokens?.refresh });
        const newTokens: AuthTokens = data.tokens;
        setTokens(newTokens);
        processQueue(null, newTokens.access);
        original.headers.Authorization = `Bearer ${newTokens.access}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/auth/login?session=expired';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed API helpers ─────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; username: string; display_name: string; role: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  requestReset: (email: string) => api.post('/auth/request-reset', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.get(`/auth/verify-email/${token}`),
  changePassword: (current: string, next: string) => api.put('/auth/change-password', { current_password: current, new_password: next }),
  changeEmail: (email: string, password: string) => api.put('/auth/change-email', { new_email: email, password }),
};

export const usersAPI = {
  getProfile: (username: string) => api.get(`/users/${username}`),
  updateProfile: (data: Record<string, unknown>) => api.put('/users/me/profile', data),
  updateSocialLinks: (links: unknown[]) => api.put('/users/me/social-links', links),
  updateSkills: (skill_ids: string[]) => api.put('/users/me/skills', { skill_ids }),
  addPortfolio: (data: Record<string, unknown>) => api.post('/users/me/portfolio', data),
  updatePortfolio: (id: string, data: Record<string, unknown>) => api.put(`/users/me/portfolio/${id}`, data),
  deletePortfolio: (id: string) => api.delete(`/users/me/portfolio/${id}`),
  updateAvailability: (status: string) => api.patch('/users/me/availability', { status }),
  updateNotificationPrefs: (prefs: Record<string, boolean>) => api.put('/users/me/notification-preferences', prefs),
  updatePrivacy: (settings: Record<string, boolean>) => api.put('/users/me/privacy', settings),
  deleteAccount: (confirm: string, password?: string) => api.delete('/users/me', { data: { confirm, password } }),
  getStats: (username: string) => api.get(`/users/${username}/stats`),
  saveCreator: (id: string) => api.post(`/users/me/saved/${id}`),
  unsaveCreator: (id: string) => api.delete(`/users/me/saved/${id}`),
  getSaved: () => api.get('/users/me/saved'),
};

export const projectsAPI = {
  search: (params: Record<string, unknown>) => api.get('/search/projects', { params }),
  get: (slug: string) => api.get(`/projects/${slug}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  mine: () => api.get('/projects/mine'),
  save: (id: string) => api.post(`/projects/${id}/save`),
  unsave: (id: string) => api.delete(`/projects/${id}/save`),
};

export const applicationsAPI = {
  apply: (data: Record<string, unknown>) => api.post('/applications', data),
  mine: () => api.get('/applications/mine'),
  forProject: (projectId: string) => api.get(`/applications/project/${projectId}`),
  updateStatus: (id: string, status: string) => api.patch(`/applications/${id}/status`, { status }),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages'),
  start: (recipient_id: string, project_id?: string) => api.post('/messages', { recipient_id, project_id }),
  getMessages: (convId: string, before?: string) => api.get(`/messages/${convId}`, { params: { before } }),
  send: (convId: string, body: string, attachments?: string[]) => api.post(`/messages/${convId}`, { body, attachments }),
};

export const reviewsAPI = {
  forUser: (username: string) => api.get(`/reviews/user/${username}`),
  create: (data: Record<string, unknown>) => api.post('/reviews', data),
};

export const notificationsAPI = {
  list: (page?: number) => api.get('/notifications', { params: { page } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const searchAPI = {
  creators: (params: Record<string, unknown>) => api.get('/search/creators', { params }),
  projects: (params: Record<string, unknown>) => api.get('/search/projects', { params }),
  skills: () => api.get('/search/skills'),
  categories: () => api.get('/search/categories'),
};

export const uploadAPI = {
  avatar: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/uploads/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  banner: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/uploads/banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  portfolio: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/uploads/portfolio', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
