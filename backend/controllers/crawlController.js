const pythonApiService = require('../services/pythonApiService');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const startCrawl = catchAsync(async (req, res, next) => {
  const {
    keyword,
    city,
    max_pages: maxPages = 5,
    spider_name: spiderName = 'mock',
    priority = 'normal'
  } = req.body;

  logger.info(`Starting crawl task with keyword: ${keyword}, city: ${city}, priority: ${priority}`);

  try {
    const result = await pythonApiService.startCrawl(
      keyword,
      city,
      parseInt(maxPages),
      spiderName,
      priority
    );

    if (!result.success) {
      if (result.fallback) {
        logger.warn('Using fallback response for crawl start');
        return res.status(202).json({
          success: true,
          data: {
            task_id: result.data?.task_id || `fallback-${Date.now()}`,
            message: '抓取任务已提交（服务降级模式）',
            status_url: `/api/crawl/task/${result.data?.task_id || 'fallback'}`,
            fallback: true,
            fallbackReason: result.fallbackReason
          }
        });
      }

      return next(new AppError('启动抓取任务失败', 500));
    }

    res.status(202).json({
      success: true,
      data: {
        task_id: result.data.task_id,
        message: '抓取任务已提交到后台队列',
        status_url: `/api/crawl/task/${result.data.task_id}`,
        priority: result.data.priority,
        queue_status: result.data.queue_status
      }
    });

  } catch (error) {
    logger.error(`Failed to start crawl task: ${error.message}`);

    const circuitStatus = pythonApiService.getCircuitBreakerStatus();
    const cacheStatus = pythonApiService.getCacheStatus();

    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: '抓取服务暂时不可用，请稍后重试',
      details: {
        circuit_breaker: circuitStatus,
        cache_status: cacheStatus,
        original_error: error.message
      }
    });
  }
});

const getCrawlTask = catchAsync(async (req, res, next) => {
  const { task_id: taskId } = req.params;

  if (!taskId) {
    return next(new AppError('无效的任务ID', 400));
  }

  try {
    const result = await pythonApiService.getCrawlTask(taskId);

    if (!result.success) {
      if (result.fallback) {
        return res.status(200).json({
          success: true,
          data: {
            ...result.data,
            fallback: true,
            fallbackReason: result.fallbackReason
          }
        });
      }
      return next(new AppError('获取任务状态失败', 500));
    }

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error(`Failed to get crawl task status: ${error.message}`);

    res.status(200).json({
      success: true,
      data: {
        id: taskId,
        status: 'unknown',
        message: '无法获取任务状态',
        fallback: true,
        fallbackReason: error.message
      }
    });
  }
});

const getRecentCrawlTasks = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  try {
    const result = await pythonApiService.getRecentCrawlTasks(parseInt(limit));

    if (!result.success) {
      if (result.fallback) {
        return res.status(200).json({
          success: true,
          data: {
            ...result.data,
            fallback: true
          }
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          tasks: [],
          fallback: true,
          fallbackReason: '无法获取任务列表'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error(`Failed to get recent crawl tasks: ${error.message}`);

    res.status(200).json({
      success: true,
      data: {
        tasks: [],
        fallback: true,
        fallbackReason: error.message
      }
    });
  }
});

const getCrawlLogs = catchAsync(async (req, res, next) => {
  const { task_id: taskId } = req.params;

  if (!taskId) {
    return next(new AppError('无效的任务ID', 400));
  }

  try {
    const taskResult = await pythonApiService.getCrawlTask(taskId);

    if (!taskResult.success) {
      if (taskResult.fallback) {
        return res.status(200).json({
          success: true,
          data: {
            task_id: taskId,
            task_info: taskResult.data,
            logs: [],
            fallback: true
          }
        });
      }
      return next(new AppError('获取任务详情失败', 500));
    }

    res.status(200).json({
      success: true,
      data: {
        task_id: taskId,
        task_info: taskResult.data,
        logs: []
      }
    });

  } catch (error) {
    logger.error(`Failed to get crawl logs: ${error.message}`);

    res.status(200).json({
      success: true,
      data: {
        task_id: taskId,
        task_info: null,
        logs: [],
        fallback: true,
        fallbackReason: error.message
      }
    });
  }
});

const getCrawlStatus = catchAsync(async (req, res, next) => {
  try {
    const circuitStatus = pythonApiService.getCircuitBreakerStatus();
    const cacheStatus = pythonApiService.getCacheStatus();

    let recentTasks = [];
    let runningTasks = [];

    try {
      const result = await pythonApiService.getRecentCrawlTasks(5);

      if (result.success && result.data) {
        const tasks = result.data.tasks || result.data || [];
        runningTasks = tasks.filter(t =>
          t.status === 'running' || t.status === 'queued' || t.status === 'pending'
        );
        recentTasks = tasks.filter(t =>
          t.status !== 'running' && t.status !== 'queued' && t.status !== 'pending'
        );
      }
    } catch (error) {
      logger.warn(`Failed to get recent tasks for status: ${error.message}`);
    }

    const isHealthy = circuitStatus.state === 'CLOSED' || circuitStatus.state === 'HALF_OPEN';

    res.status(200).json({
      success: true,
      data: {
        running_count: runningTasks.length,
        is_running: runningTasks.length > 0,
        running_tasks: runningTasks,
        recent_tasks: recentTasks.slice(0, 10),
        health: {
          status: isHealthy ? 'healthy' : 'degraded',
          circuit_breaker: circuitStatus,
          cache_status: cacheStatus
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Failed to get crawl status: ${error.message}`);

    const circuitStatus = pythonApiService.getCircuitBreakerStatus();

    res.status(200).json({
      success: true,
      data: {
        running_count: 0,
        is_running: false,
        running_tasks: [],
        recent_tasks: [],
        health: {
          status: 'degraded',
          circuit_breaker: circuitStatus
        },
        fallback: true,
        fallbackReason: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

const quickCrawl = catchAsync(async (req, res, next) => {
  const { keyword, city } = req.body;

  if (!keyword && !city) {
    return next(new AppError('请提供关键词或城市', 400));
  }

  logger.info(`Starting quick crawl with keyword: ${keyword}, city: ${city}`);

  try {
    const result = await pythonApiService.startCrawl(
      keyword,
      city,
      3,
      'mock',
      'urgent'
    );

    if (!result.success) {
      if (result.fallback) {
        return res.status(202).json({
          success: true,
          data: {
            task_id: result.data?.task_id || `quick-${Date.now()}`,
            message: '快速抓取任务已提交（服务降级模式）',
            status_url: `/api/crawl/task/${result.data?.task_id || 'fallback'}`,
            estimated_time: '30-60秒',
            fallback: true,
            fallbackReason: result.fallbackReason
          }
        });
      }
      return next(new AppError('启动快速抓取失败', 500));
    }

    const taskId = result.data.task_id;

    res.status(202).json({
      success: true,
      data: {
        task_id: taskId,
        message: '快速抓取任务已启动',
        status_url: `/api/crawl/task/${taskId}`,
        estimated_time: '30-60秒',
        priority: 'urgent'
      }
    });

  } catch (error) {
    logger.error(`Failed to start quick crawl: ${error.message}`);

    const circuitStatus = pythonApiService.getCircuitBreakerStatus();

    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: '快速抓取服务暂时不可用',
      details: {
        circuit_breaker: circuitStatus,
        original_error: error.message
      }
    });
  }
});

const getHealthStatus = catchAsync(async (req, res, next) => {
  try {
    const circuitStatus = pythonApiService.getCircuitBreakerStatus();
    const cacheStatus = pythonApiService.getCacheStatus();

    let pythonApiHealth = null;
    try {
      pythonApiHealth = await pythonApiService.getHealthStatus();
    } catch (error) {
      logger.warn(`Python API health check failed: ${error.message}`);
    }

    const isHealthy = circuitStatus.state === 'CLOSED' || circuitStatus.state === 'HALF_OPEN';

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        components: {
          nodejs_backend: {
            status: 'healthy',
            uptime: process.uptime()
          },
          python_api: {
            status: pythonApiHealth?.success ? 'healthy' : 'unreachable',
            details: pythonApiHealth?.data
          },
          circuit_breaker: circuitStatus,
          cache: cacheStatus
        }
      }
    });

  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);

    res.status(200).json({
      success: true,
      data: {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        fallback: true,
        fallbackReason: error.message
      }
    });
  }
});

module.exports = {
  startCrawl,
  getCrawlTask,
  getRecentCrawlTasks,
  getCrawlLogs,
  getCrawlStatus,
  quickCrawl,
  getHealthStatus
};
