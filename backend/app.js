const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const config = require('./config/config');
const routes = require('./routes');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: config.frontend.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Session-Id']
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: config.rateLimit.message
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '招聘岗位聚合分析系统 - Node.js API',
      version: '1.0.0',
      description: '业务接口层，负责与前端通信并调用Python数据分析服务',
      endpoints: {
        jobs: '/api/jobs',
        favorites: '/api/favorites',
        comparisons: '/api/comparisons',
        analysis: '/api/analysis',
        crawl: '/api/crawl',
        health: '/api/health'
      }
    }
  });
});

app.use('/api', routes);

app.all('*', (req, res, next) => {
  next(new AppError(`无法找到 ${req.originalUrl} 资源`, 404));
});

app.use(errorHandler);

app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  logger.info(`Node.js API 服务器运行在 http://${HOST}:${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Python API: ${config.pythonApi.baseUrl}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

module.exports = app;
