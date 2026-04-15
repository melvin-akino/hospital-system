import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ihims_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear ALL auth storage including Zustand's persisted state
      localStorage.removeItem('ihims_token');
      localStorage.removeItem('ihims_user');
      localStorage.removeItem('ihims_auth'); // Zustand persist key — prevents the login↔dashboard loop
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
