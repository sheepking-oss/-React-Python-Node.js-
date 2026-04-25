import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let userSessionId = localStorage.getItem('userSessionId');

if (!userSessionId) {
  userSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('userSessionId', userSessionId);
}

api.interceptors.request.use(
  (config) => {
    if (userSessionId) {
      config.headers['X-User-Session-Id'] = userSessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('API Network Error:', error.request);
    } else {
      console.error('API Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const jobApi = {
  search: async (params) => {
    const response = await api.get('/api/jobs/search', { params });
    return response.data;
  },

  getById: async (jobId) => {
    const response = await api.get(`/api/jobs/${jobId}`);
    return response.data;
  },

  getFilterOptions: async () => {
    const response = await api.get('/api/jobs/filters/options');
    return response.data;
  },

  getSuggestions: async (query) => {
    const response = await api.get('/api/jobs/suggestions', { params: { q: query } });
    return response.data;
  },

  getRelated: async (jobId) => {
    const response = await api.get(`/api/jobs/related/${jobId}`);
    return response.data;
  },
};

export const favoriteApi = {
  getAll: async (folderName = null) => {
    const params = folderName ? { folder_name: folderName } : {};
    const response = await api.get('/api/favorites', { params });
    return response.data;
  },

  getFolders: async () => {
    const response = await api.get('/api/favorites/folders');
    return response.data;
  },

  check: async (jobId) => {
    const response = await api.get(`/api/favorites/check/${jobId}`);
    return response.data;
  },

  add: async (jobId, folderName = '默认收藏夹', notes = null) => {
    const data = {
      job_id: jobId,
      folder_name: folderName,
      notes,
    };
    const response = await api.post('/api/favorites', data);
    return response.data;
  },

  remove: async (jobId) => {
    const response = await api.delete(`/api/favorites/${jobId}`);
    return response.data;
  },

  update: async (jobId, folderName = null, notes = null) => {
    const data = {};
    if (folderName) data.folder_name = folderName;
    if (notes) data.notes = notes;
    const response = await api.put(`/api/favorites/${jobId}`, data);
    return response.data;
  },
};

export const comparisonApi = {
  create: async (name = '对比分析') => {
    const params = new URLSearchParams();
    params.append('name', name);
    const response = await api.post(`/api/comparisons/create?${params.toString()}`);
    return response.data;
  },

  get: async (sessionId) => {
    const response = await api.get(`/api/comparisons/${sessionId}`);
    return response.data;
  },

  add: async (jobId, sessionId = null) => {
    const params = new URLSearchParams();
    params.append('job_id', jobId);
    if (sessionId) {
      params.append('session_id', sessionId);
    }
    const response = await api.post(`/api/comparisons/add?${params.toString()}`);
    return response.data;
  },

  batchAdd: async (jobIds, sessionId = null) => {
    const data = {
      job_ids: jobIds,
      session_id: sessionId,
    };
    const response = await api.post('/api/comparisons/batch-add', data);
    return response.data;
  },

  remove: async (sessionId, jobId) => {
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    params.append('job_id', jobId);
    const response = await api.delete(`/api/comparisons/remove?${params.toString()}`);
    return response.data;
  },

  getReport: async (sessionId) => {
    const response = await api.get(`/api/comparisons/report/${sessionId}`);
    return response.data;
  },
};

export const analysisApi = {
  getWordCloud: async (params) => {
    const response = await api.get('/api/analysis/wordcloud', { params });
    return response.data;
  },

  getSalaryDistribution: async (params) => {
    const response = await api.get('/api/analysis/salary/distribution', { params });
    return response.data;
  },

  getSalaryByGroup: async (groupBy, keyword = null) => {
    const params = { group_by: groupBy };
    if (keyword) params.keyword = keyword;
    const response = await api.get('/api/analysis/salary/group', { params });
    return response.data;
  },

  getSalaryTrend: async (params) => {
    const response = await api.get('/api/analysis/salary/trend', { params });
    return response.data;
  },

  getHeatmap: async (params) => {
    const response = await api.get('/api/analysis/heatmap', { params });
    return response.data;
  },

  getDailyStats: async (params) => {
    const response = await api.get('/api/analysis/daily', { params });
    return response.data;
  },

  getWeekdayStats: async (params) => {
    const response = await api.get('/api/analysis/weekday', { params });
    return response.data;
  },

  getDashboard: async (city = null) => {
    const params = city ? { city } : {};
    const response = await api.get('/api/analysis/dashboard', { params });
    return response.data;
  },

  getCombined: async (params) => {
    const response = await api.get('/api/analysis/combined', { params });
    return response.data;
  },
};

export const crawlApi = {
  start: async (keyword, city = null, maxPages = 5, spiderName = 'mock') => {
    const data = {
      keyword,
      city,
      max_pages: maxPages,
      spider_name: spiderName,
    };
    const response = await api.post('/api/crawl/start', data);
    return response.data;
  },

  quick: async (keyword, city = null) => {
    const data = { keyword, city };
    const response = await api.post('/api/crawl/quick', data);
    return response.data;
  },

  getTask: async (taskId) => {
    const response = await api.get(`/api/crawl/task/${taskId}`);
    return response.data;
  },

  getRecentTasks: async (limit = 10) => {
    const response = await api.get('/api/crawl/tasks', { params: { limit } });
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/api/crawl/status');
    return response.data;
  },

  getLogs: async (taskId) => {
    const response = await api.get(`/api/crawl/task/${taskId}/logs`);
    return response.data;
  },
};

export default api;
