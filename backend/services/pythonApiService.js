const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || config.circuitBreaker.failureThreshold;
    this.successThreshold = options.successThreshold || config.circuitBreaker.successThreshold;
    this.timeout = options.timeout || config.circuitBreaker.timeout;
    this.resetTimeout = options.resetTimeout || config.circuitBreaker.resetTimeout;
    this.enabled = config.circuitBreaker.enabled;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.failureHistory = [];
  }

  canExecute() {
    if (!this.enabled) return true;

    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info('[CircuitBreaker] Transitioning to HALF_OPEN state for recovery test');
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    if (!this.enabled) return;

    this.failureCount = 0;
    this.failureHistory = [];

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info('[CircuitBreaker] Service recovered, transitioning to CLOSED state');
      }
    }
  }

  recordFailure(error) {
    if (!this.enabled) return;

    this.failureCount++;
    this.failureHistory.push({
      time: Date.now(),
      error: error?.message || String(error),
      code: error?.code || error?.response?.status
    });

    if (this.failureHistory.length > 20) {
      this.failureHistory = this.failureHistory.slice(-20);
    }

    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successCount = 0;
      logger.warn(`[CircuitBreaker] Recovery test failed, transitioning to OPEN state. Error: ${error?.message}`);
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker] Failure threshold (${this.failureThreshold}) reached, transitioning to OPEN state. Will reset after ${this.resetTimeout}ms`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      recentFailures: this.failureHistory.slice(-5)
    };
  }
}

class FallbackCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || config.fallback.cacheTtl * 1000;
    this.enabled = config.fallback.enabled;
  }

  _generateKey(endpoint, params) {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramsStr}`;
  }

  get(endpoint, params = {}) {
    if (!this.enabled) return null;

    const key = this._generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    logger.debug(`[FallbackCache] Cache hit for ${endpoint}`);
    return entry.data;
  }

  set(endpoint, params = {}, data) {
    if (!this.enabled) return;

    const key = this._generateKey(endpoint, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    logger.debug(`[FallbackCache] Cache set for ${endpoint}`);
  }

  clear() {
    this.cache.clear();
    logger.info('[FallbackCache] Cache cleared');
  }

  getStats() {
    return {
      enabled: this.enabled,
      size: this.cache.size,
      ttl: this.ttl
    };
  }
}

class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || config.pythonApi.retry.maxRetries;
    this.retryDelay = options.retryDelay || config.pythonApi.retry.retryDelay;
    this.backoffMultiplier = options.backoffMultiplier || config.pythonApi.retry.backoffMultiplier;
    this.retryableStatusCodes = options.retryableStatusCodes || config.pythonApi.retry.retryableStatusCodes;
    this.retryableErrors = options.retryableErrors || config.pythonApi.retry.retryableErrors;
  }

  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) {
      return false;
    }

    if (error.response) {
      return this.retryableStatusCodes.includes(error.response.status);
    }

    if (error.code) {
      return this.retryableErrors.includes(error.code);
    }

    return false;
  }

  getDelay(attempt) {
    return this.retryDelay * Math.pow(this.backoffMultiplier, attempt - 1);
  }

  async wait(attempt) {
    const delay = this.getDelay(attempt);
    logger.debug(`[RetryManager] Waiting ${delay}ms before retry attempt ${attempt + 1}`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

class PythonApiService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
    this.fallbackCache = new FallbackCache();
    this.retryManager = new RetryManager();

    this.axiosInstance = axios.create({
      baseURL: config.pythonApi.baseUrl,
      timeout: config.pythonApi.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this._setupInterceptors();
  }

  _setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(`[PythonAPI] Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('[PythonAPI] Request configuration error:', error.message);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(
            `[PythonAPI] Response Error: ${error.response.status} - ${error.response.statusText}`,
            error.response.data
          );
        } else if (error.code) {
          logger.error(`[PythonAPI] Connection Error: ${error.code} - ${error.message}`);
        } else {
          logger.error('[PythonAPI] Unknown Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async _executeWithRetry(endpoint, executor, options = {}) {
    const { useFallback = true, cacheKey = null } = options;
    let attempt = 0;

    while (true) {
      try {
        if (!this.circuitBreaker.canExecute()) {
          logger.warn('[PythonAPI] Circuit breaker is OPEN, using fallback');
          if (useFallback) {
            const fallback = this.fallbackCache.get(cacheKey || endpoint);
            if (fallback) {
              return {
                ...fallback,
                fallback: true,
                fallbackReason: 'circuit_breaker_open'
              };
            }
          }
          throw new Error('Circuit breaker is OPEN and no fallback available');
        }

        const response = await executor();
        this.circuitBreaker.recordSuccess();

        if (cacheKey && response.data?.success) {
          this.fallbackCache.set(cacheKey || endpoint, {}, response.data);
        }

        return response.data;

      } catch (error) {
        attempt++;

        if (this.retryManager.shouldRetry(error, attempt)) {
          logger.warn(
            `[PythonAPI] Attempt ${attempt} failed for ${endpoint}. Error: ${error.message}. Retrying...`
          );
          await this.retryManager.wait(attempt);
          continue;
        }

        this.circuitBreaker.recordFailure(error);

        if (useFallback) {
          const fallback = this.fallbackCache.get(cacheKey || endpoint);
          if (fallback) {
            logger.info(`[PythonAPI] Using cached fallback for ${endpoint}`);
            return {
              ...fallback,
              fallback: true,
              fallbackReason: 'error_fallback',
              originalError: error.message
            };
          }
        }

        throw error;
      }
    }
  }

  async searchJobs(params) {
    const cacheKey = `search:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/jobs/search',
      () => this.axiosInstance.get('/api/jobs/search', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getJobDetail(jobId) {
    const cacheKey = `job:${jobId}`;
    return this._executeWithRetry(
      `/api/jobs/${jobId}`,
      () => this.axiosInstance.get(`/api/jobs/${jobId}`),
      { useFallback: true, cacheKey }
    );
  }

  async getFilterOptions() {
    const cacheKey = 'filter-options';
    return this._executeWithRetry(
      '/api/jobs/filters/options',
      () => this.axiosInstance.get('/api/jobs/filters/options'),
      { useFallback: true, cacheKey }
    );
  }

  async getFavorites(userSessionId, folderName = null) {
    const params = { user_session_id: userSessionId };
    if (folderName) {
      params.folder_name = folderName;
    }
    return this._executeWithRetry(
      '/api/favorites',
      () => this.axiosInstance.get('/api/favorites', { params }),
      { useFallback: false }
    );
  }

  async addFavorite(data) {
    return this._executeWithRetry(
      '/api/favorites',
      () => this.axiosInstance.post('/api/favorites', data),
      { useFallback: false }
    );
  }

  async removeFavorite(jobId, userSessionId) {
    return this._executeWithRetry(
      `/api/favorites/${jobId}`,
      () => this.axiosInstance.delete(`/api/favorites/${jobId}`, {
        params: { user_session_id: userSessionId }
      }),
      { useFallback: false }
    );
  }

  async createComparison(userSessionId, name) {
    const params = new URLSearchParams();
    params.append('user_session_id', userSessionId);
    if (name) {
      params.append('name', name);
    }
    return this._executeWithRetry(
      '/api/comparison/create',
      () => this.axiosInstance.post(`/api/comparison/create?${params.toString()}`),
      { useFallback: false }
    );
  }

  async getComparison(sessionId) {
    return this._executeWithRetry(
      `/api/comparison/${sessionId}`,
      () => this.axiosInstance.get(`/api/comparison/${sessionId}`),
      { useFallback: false }
    );
  }

  async addToComparison(jobId, sessionId) {
    const params = new URLSearchParams();
    params.append('job_id', jobId);
    params.append('session_id', sessionId);
    return this._executeWithRetry(
      '/api/comparison/add',
      () => this.axiosInstance.post(`/api/comparison/add?${params.toString()}`),
      { useFallback: false }
    );
  }

  async removeFromComparison(sessionId, jobId) {
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    params.append('job_id', jobId);
    return this._executeWithRetry(
      '/api/comparison/remove',
      () => this.axiosInstance.delete(`/api/comparison/remove?${params.toString()}`),
      { useFallback: false }
    );
  }

  async getWordCloud(params) {
    const cacheKey = `wordcloud:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/analysis/wordcloud',
      () => this.axiosInstance.get('/api/analysis/wordcloud', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getSalaryDistribution(params) {
    const cacheKey = `salary-distribution:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/analysis/salary/distribution',
      () => this.axiosInstance.get('/api/analysis/salary/distribution', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getSalaryByGroup(groupBy, keyword = null) {
    const params = { group_by: groupBy };
    if (keyword) {
      params.keyword = keyword;
    }
    const cacheKey = `salary-group:${groupBy}:${keyword}`;
    return this._executeWithRetry(
      '/api/analysis/salary/group',
      () => this.axiosInstance.get('/api/analysis/salary/group', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getSalaryTrend(params) {
    const cacheKey = `salary-trend:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/analysis/salary/trend',
      () => this.axiosInstance.get('/api/analysis/salary/trend', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getHeatmap(params) {
    const cacheKey = `heatmap:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/analysis/heatmap',
      () => this.axiosInstance.get('/api/analysis/heatmap', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getDailyStats(params) {
    const cacheKey = `daily-stats:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/analysis/daily',
      () => this.axiosInstance.get('/api/analysis/daily', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getWeekdayStats(params) {
    const cacheKey = `weekday-stats:${JSON.stringify(params)}`;
    return this._executeWithRetry(
      '/api/analysis/weekday',
      () => this.axiosInstance.get('/api/analysis/weekday', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async getDashboard(city = null) {
    const params = {};
    if (city) {
      params.city = city;
    }
    const cacheKey = `dashboard:${city}`;
    return this._executeWithRetry(
      '/api/analysis/dashboard',
      () => this.axiosInstance.get('/api/analysis/dashboard', { params }),
      { useFallback: true, cacheKey }
    );
  }

  async startCrawl(keyword, city, maxPages, spiderName = 'mock', priority = 'normal') {
    const params = {
      keyword,
      city,
      max_pages: maxPages,
      spider_name: spiderName,
      priority
    };
    return this._executeWithRetry(
      '/api/crawl/start',
      () => this.axiosInstance.post('/api/crawl/start', null, { params }),
      { useFallback: false }
    );
  }

  async getCrawlTask(taskId) {
    return this._executeWithRetry(
      `/api/crawl/task/${taskId}`,
      () => this.axiosInstance.get(`/api/crawl/task/${taskId}`),
      { useFallback: false }
    );
  }

  async getRecentCrawlTasks(limit = 10) {
    return this._executeWithRetry(
      '/api/crawl/tasks',
      () => this.axiosInstance.get('/api/crawl/tasks', { params: { limit } }),
      { useFallback: false }
    );
  }

  async getHealthStatus() {
    return this._executeWithRetry(
      '/api/health',
      () => this.axiosInstance.get('/api/health'),
      { useFallback: false }
    );
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  getCacheStatus() {
    return this.fallbackCache.getStats();
  }

  clearCache() {
    this.fallbackCache.clear();
  }
}

const pythonApiService = new PythonApiService();

module.exports = pythonApiService;
