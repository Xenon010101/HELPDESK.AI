import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { API_CONFIG } from '../config';

const apiClient = axios.create({
  baseURL: API_CONFIG.BACKEND_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.refresh_token) {
        try {
          const { data } = await supabase.auth.refreshSession();
          if (data?.session?.access_token) {
            error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
            return apiClient(error.config);
          }
        } catch {
        }
      }
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden', {
        detail: { message: error.response?.data?.detail || 'Access denied' },
      }));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
