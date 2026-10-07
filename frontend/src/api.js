import axios from 'axios';

const api = axios.create({ withCredentials: true });
api.interceptors.request.use(config => {
  try {
    const token = JSON.parse(localStorage.getItem('user'))?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { localStorage.removeItem('user'); }
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
    localStorage.removeItem('user');
    window.location.replace('/');
  }
  return Promise.reject(error);
});
export default api;
