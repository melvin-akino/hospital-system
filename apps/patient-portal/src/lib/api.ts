import axios from 'axios';

const api = axios.create({
  baseURL: '/api/patient-portal',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT from patient portal token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('patient_portal_token');
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
      localStorage.removeItem('patient_portal_token');
      localStorage.removeItem('patient_portal_patient');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
