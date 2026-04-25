const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const pythonApi = axios.create({
  baseURL: config.pythonApi.baseUrl,
  timeout: config.pythonApi.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

pythonApi.interceptors.request.use(
  (config) => {
    logger.debug(`Python API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('Python API Request Error:', error);
    return Promise.reject(error);
  }
);

pythonApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error(`Python API Error: ${error.response.status} - ${error.response.statusText}`);
      logger.error('Response:', error.response.data);
    } else if (error.request) {
      logger.error('Python API No Response:', error.request);
    } else {
      logger.error('Python API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

class PythonApiService {
  async searchJobs(params) {
    const response = await pythonApi.get('/api/jobs/search', { params });
    return response.data;
  }

  async getJobDetail(jobId) {
    const response = await pythonApi.get(`/api/jobs/${jobId}`);
    return response.data;
  }

  async getFilterOptions() {
    const response = await pythonApi.get('/api/jobs/filters/options');
    return response.data;
  }

  async getFavorites(userSessionId, folderName = null) {
    const params = { user_session_id: userSessionId };
    if (folderName) {
      params.folder_name = folderName;
    }
    const response = await pythonApi.get('/api/favorites', { params });
    return response.data;
  }

  async addFavorite(data) {
    const response = await pythonApi.post('/api/favorites', data);
    return response.data;
  }

  async removeFavorite(jobId, userSessionId) {
    const response = await pythonApi.delete(`/api/favorites/${jobId}`, {
      params: { user_session_id: userSessionId }
    });
    return response.data;
  }

  async createComparison(userSessionId, name) {
    const params = new URLSearchParams();
    params.append('user_session_id', userSessionId);
    if (name) {
      params.append('name', name);
    }
    const response = await pythonApi.post(`/api/comparison/create?${params.toString()}`);
    return response.data;
  }

  async getComparison(sessionId) {
    const response = await pythonApi.get(`/api/comparison/${sessionId}`);
    return response.data;
  }

  async addToComparison(jobId, sessionId) {
    const params = new URLSearchParams();
    params.append('job_id', jobId);
    params.append('session_id', sessionId);
    const response = await pythonApi.post(`/api/comparison/add?${params.toString()}`);
    return response.data;
  }

  async removeFromComparison(sessionId, jobId) {
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    params.append('job_id', jobId);
    const response = await pythonApi.delete(`/api/comparison/remove?${params.toString()}`);
    return response.data;
  }

  async getWordCloud(params) {
    const response = await pythonApi.get('/api/analysis/wordcloud', { params });
    return response.data;
  }

  async getSalaryDistribution(params) {
    const response = await pythonApi.get('/api/analysis/salary/distribution', { params });
    return response.data;
  }

  async getSalaryByGroup(groupBy, keyword = null) {
    const params = { group_by: groupBy };
    if (keyword) {
      params.keyword = keyword;
    }
    const response = await pythonApi.get('/api/analysis/salary/group', { params });
    return response.data;
  }

  async getSalaryTrend(params) {
    const response = await pythonApi.get('/api/analysis/salary/trend', { params });
    return response.data;
  }

  async getHeatmap(params) {
    const response = await pythonApi.get('/api/analysis/heatmap', { params });
    return response.data;
  }

  async getDailyStats(params) {
    const response = await pythonApi.get('/api/analysis/daily', { params });
    return response.data;
  }

  async getWeekdayStats(params) {
    const response = await pythonApi.get('/api/analysis/weekday', { params });
    return response.data;
  }

  async getDashboard(city = null) {
    const params = {};
    if (city) {
      params.city = city;
    }
    const response = await pythonApi.get('/api/analysis/dashboard', { params });
    return response.data;
  }

  async startCrawl(keyword, city, maxPages, spiderName = 'mock') {
    const params = { keyword, city, max_pages: maxPages, spider_name: spiderName };
    const response = await pythonApi.post('/api/crawl/start', null, { params });
    return response.data;
  }

  async getCrawlTask(taskId) {
    const response = await pythonApi.get(`/api/crawl/task/${taskId}`);
    return response.data;
  }

  async getRecentCrawlTasks(limit = 10) {
    const response = await pythonApi.get('/api/crawl/tasks', { params: { limit } });
    return response.data;
  }
}

module.exports = new PythonApiService();
