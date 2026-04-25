require('dotenv').config();

module.exports = {
  server: {
    port: process.env.NODE_PORT || 3001,
    host: process.env.NODE_HOST || '0.0.0.0'
  },

  pythonApi: {
    baseUrl: process.env.PYTHON_API_URL || 'http://localhost:8001',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000
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
