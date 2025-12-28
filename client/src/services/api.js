import axios from 'axios';

// 從環境變數讀取 API URL，如果沒有則使用默認值
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// 在開發環境中顯示使用的 API URL
if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API Base URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器：添加 token
api.interceptors.request.use(
  (config) => {
    // 登入請求不需要 token，跳過
    if (config.url && config.url.includes('/auth/login')) {
      return config;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器：處理錯誤
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (loginid, password) => api.post('/auth/login', { loginid, Password: password }),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

// Patient API
export const patientAPI = {
  getAll: () => api.get('/patients'),
  getByLoginId: (loginid) => api.get(`/patients/${loginid}`),
  register: (data) => api.post('/patients/register', data),
  create: (data) => api.post('/patients', data),
  update: (loginid, data) => api.put(`/patients/${loginid}`, data),
  delete: (loginid) => api.delete(`/patients/${loginid}`),
};

// Patient Record API
export const patientRecordAPI = {
  getAll: (params) => api.get('/patient-records', { params }),
  getByLoginId: (loginid) => api.get(`/patient-records/patient/${loginid}`),
  getById: (id) => api.get(`/patient-records/${id}`),
  create: (formData) => api.post('/patient-records', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/patient-records/${id}`, data),
  delete: (id) => api.delete(`/patient-records/${id}`),
};

// Report API
export const reportAPI = {
  checkStatus: (patientId, recordId) => api.get(`/report/${patientId}/${recordId}/status`),
  download: (patientId, recordId, language = 'zh_tw') => {
    return api.get(`/report/${patientId}/${recordId}?language=${language}`, {
      responseType: 'blob'
    });
  },
  getReportUrl: (patientId, recordId, language = 'zh_tw') => {
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
    return `${apiBaseUrl.replace('/api', '')}/api/report/${patientId}/${recordId}?language=${language}`;
  }
};

export default api;


