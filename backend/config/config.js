require('dotenv').config();

module.exports = {
  server: {
    port: process.env.NODE_PORT || 3001,
    host: process.env.NODE_HOST || '0.0.0.0'
  },

  pythonApi: {
    baseUrl: process.env.PYTHON_API_URL || 'http://localhost:8001',
    timeout: parseInt(process.env.API_TIMEOUT) || 15000,
    retry: {
      maxRetries: parseInt(process.env.RETRY_MAX) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
      backoffMultiplier: 2,
      retryableStatusCodes: [503, 504, 429, 500, 502],
      retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN']
    }
  },

  circuitBreaker: {
    enabled: true,
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD) || 5,
    successThreshold: parseInt(process.env.CB_SUCCESS_THRESHOLD) || 3,
    timeout: parseInt(process.env.CB_TIMEOUT) || 10000,
    resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT) || 30000
  },

  fallback: {
    enabled: true,
    cacheTtl: parseInt(process.env.FALLBACK_TTL) || 300,
    maxDataAgeHours: parseInt(process.env.FALLBACK_MAX_AGE) || 24,
    minJobsRequired: parseInt(process.env.FALLBACK_MIN_JOBS) || 10
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  cache: {
    defaultTtl: parseInt(process.env.CACHE_TTL) || 300
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '请求过于频繁，请稍后再试'
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100
  },

  comparison: {
    maxItems: 5
  },

  session: {
    secret: process.env.SESSION_SECRET || 'job-aggregator-secret-key-2024'
  }
};
