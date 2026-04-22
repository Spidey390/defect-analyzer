import axios from 'axios';

const api = axios.create({ baseURL: '' });

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const analysisAPI = {
  uploadCSV: (file, projectName) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('project_name', projectName);
    return api.post('/api/analysis/upload-csv', fd);
  },
  getJiraProjects: () => api.get('/api/analysis/jira/projects'),
  analyzeJira: (projectKey, projectName) =>
    api.post(`/api/analysis/jira/${projectKey}?project_name=${encodeURIComponent(projectName)}`),
  analyzeGit: (repoUrl, projectName) =>
    api.post('/api/analysis/git', { repo_url: repoUrl, project_name: projectName }),
  getHistory: () => api.get('/api/analysis/history'),
  getAnalysis: (id) => api.get(`/api/analysis/${id}`),
  downloadCSV: (id) => api.get(`/api/analysis/${id}/download`, { responseType: 'blob' }),
  syncPowerBI: (id) => api.post(`/api/analysis/${id}/sync-powerbi`),
};

export const authAPI = {
  saveJiraConfig: (config) => api.put('/api/auth/jira-config', config),
  getMe: () => api.get('/api/auth/me'),
};

export const adminAPI = {
  getUsers: () => api.get('/api/admin/users'),
  toggleActive: (id) => api.put(`/api/admin/users/${id}/toggle-active`),
  toggleAdmin: (id) => api.put(`/api/admin/users/${id}/toggle-admin`),
  getAuditLogs: () => api.get('/api/admin/audit-logs'),
  getStats: () => api.get('/api/admin/stats'),
};

export default api;
