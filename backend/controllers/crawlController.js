const pythonApiService = require('../services/pythonApiService');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const startCrawl = catchAsync(async (req, res, next) => {
  const { keyword, city, max_pages: maxPages = 5, spider_name: spiderName = 'mock' } = req.body;

  logger.info(`Starting crawl task with keyword: ${keyword}, city: ${city}`);

  const result = await pythonApiService.startCrawl(keyword, city, parseInt(maxPages), spiderName);

  if (!result.success) {
    return next(new AppError('启动抓取任务失败', 500));
  }

  res.status(202).json({
    success: true,
    data: {
      task_id: result.data.task_id,
      message: '抓取任务已启动',
      status_url: `/api/crawl/task/' + result.data.task_id
    }
  });
});

const getCrawlTask = catchAsync(async (req, res, next) => {
  const { task_id: taskId } = req.params;

  if (!taskId || isNaN(parseInt(taskId))) {
    return next(new AppError('无效的任务ID', 400));
  }

  const result = await pythonApiService.getCrawlTask(parseInt(taskId));

  if (!result.success) {
    return next(new AppError('获取任务状态失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getRecentCrawlTasks = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const result = await pythonApiService.getRecentCrawlTasks(parseInt(limit));

  if (!result.success) {
    return next(new AppError('获取最近任务失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getCrawlLogs = catchAsync(async (req, res, next) => {
  const { task_id: taskId } = req.params;

  if (!taskId || isNaN(parseInt(taskId))) {
    return next(new AppError('无效的任务ID', 400));
  }

  const taskResult = await pythonApiService.getCrawlTask(parseInt(taskId));

  if (!taskResult.success) {
    return next(new AppError('获取任务详情失败', 500));
  }

  res.status(200).json({
    success: true,
    data: {
      task_id: parseInt(taskId),
      task_info: taskResult.data,
      logs: []
    }
  });
});

const getCrawlStatus = catchAsync(async (req, res, next) => {
  const result = await pythonApiService.getRecentCrawlTasks(5);

  if (!result.success) {
    return res.status(200).json({
      success: true,
      data: {
        running_tasks: [],
        recent_tasks: [],
        status: 'idle'
      }
    });
  }

  const tasks = result.data || [];
  const runningTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');
  const recentTasks = tasks.filter(t => t.status !== 'running' && t.status !== 'pending');

  const status = {
    running_count: runningTasks.length,
    is_running: runningTasks.length > 0,
    running_tasks: runningTasks,
    recent_tasks: recentTasks.slice(0, 10)
  };

  res.status(200).json({
    success: true,
    data: status
  });
});

const quickCrawl = catchAsync(async (req, res, next) => {
  const { keyword, city } = req.body;

  if (!keyword && !city) {
    return next(new AppError('请提供关键词或城市', 400));
  }

  logger.info(`Starting quick crawl with keyword: ${keyword}, city: ${city}`);

  const result = await pythonApiService.startCrawl(keyword, city, 3, 'mock');

  if (!result.success) {
    return next(new AppError('启动快速抓取失败', 500));
  }

  const taskId = result.data.task_id;

  res.status(202).json({
    success: true,
    data: {
      task_id: taskId,
      message: '快速抓取任务已启动',
      status_url: `/api/crawl/task/${taskId}`,
      estimated_time: '30-60秒'
    }
  });
});

module.exports = {
  startCrawl,
  getCrawlTask,
  getRecentCrawlTasks,
  getCrawlLogs,
  getCrawlStatus,
  quickCrawl
};
