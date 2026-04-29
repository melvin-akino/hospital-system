import axios from 'axios';

const portalApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach portal JWT (stored separately from staff token)
portalApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('portal_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Only log out on 401 from portal-specific endpoints (not unrelated staff endpoints)
portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const isPortalEndpoint = url.includes('/patient-portal/');
    if (error.response?.status === 401 && isPortalEndpoint) {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('pibs_portal_auth');
      window.location.href = '/portal/login';
    }
    return Promise.reject(error);
  }
);

export default portalApi;
