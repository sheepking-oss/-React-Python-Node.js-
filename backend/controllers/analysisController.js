const pythonApiService = require('../services/pythonApiService');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getWordCloud = catchAsync(async (req, res, next) => {
  const { keyword, city, industry, days = 30, use_cache: useCache = true } = req.query;

  logger.info(`Getting word cloud analysis with params: ${JSON.stringify(req.query)}`);

  const params = {
    keyword: keyword || undefined,
    city: city || undefined,
    industry: industry || undefined,
    days: parseInt(days),
    use_cache: useCache !== 'false'
  };

  const result = await pythonApiService.getWordCloud(params);

  if (!result.success) {
    return next(new AppError('获取词云分析失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getSalaryDistribution = catchAsync(async (req, res, next) => {
  const { keyword, city, industry, education, experience, use_cache: useCache = true } = req.query;

  logger.info(`Getting salary distribution with params: ${JSON.stringify(req.query)}`);

  const params = {
    keyword: keyword || undefined,
    city: city || undefined,
    industry: industry || undefined,
    education: education || undefined,
    experience: experience || undefined,
    use_cache: useCache !== 'false'
  };

  const result = await pythonApiService.getSalaryDistribution(params);

  if (!result.success) {
    return next(new AppError('获取薪资分布失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getSalaryByGroup = catchAsync(async (req, res, next) => {
  const { group_by: groupBy = 'city', keyword, use_cache: useCache = true } = req.query;

  const validGroups = ['city', 'education', 'experience', 'industry', 'company_size'];
  if (!validGroups.includes(groupBy)) {
    return next(new AppError(`无效的分组类型，有效值: ${validGroups.join(', ')}`, 400));
  }

  logger.info(`Getting salary by group: ${groupBy}`);

  const result = await pythonApiService.getSalaryByGroup(groupBy, keyword);

  if (!result.success) {
    return next(new AppError('获取薪资分组失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getSalaryTrend = catchAsync(async (req, res, next) => {
  const { keyword, city, days = 90, use_cache: useCache = true } = req.query;

  logger.info(`Getting salary trend with params: ${JSON.stringify(req.query)}`);

  const params = {
    keyword: keyword || undefined,
    city: city || undefined,
    days: parseInt(days),
    use_cache: useCache !== 'false'
  };

  const result = await pythonApiService.getSalaryTrend(params);

  if (!result.success) {
    return next(new AppError('获取薪资趋势失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getHeatmap = catchAsync(async (req, res, next) => {
  const { keyword, industry, days = 30, metric = 'count', use_cache: useCache = true } = req.query;

  const validMetrics = ['count', 'avg_salary'];
  if (!validMetrics.includes(metric)) {
    return next(new AppError(`无效的指标类型，有效值: ${validMetrics.join(', ')}`, 400));
  }

  logger.info(`Getting heatmap with metric: ${metric}`);

  const params = {
    keyword: keyword || undefined,
    industry: industry || undefined,
    days: parseInt(days),
    metric: metric,
    use_cache: useCache !== 'false'
  };

  const result = await pythonApiService.getHeatmap(params);

  if (!result.success) {
    return next(new AppError('获取热力图失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getDailyStats = catchAsync(async (req, res, next) => {
  const { city, industry, days = 30, use_cache: useCache = true } = req.query;

  logger.info(`Getting daily stats with params: ${JSON.stringify(req.query)}`);

  const params = {
    city: city || undefined,
    industry: industry || undefined,
    days: parseInt(days),
    use_cache: useCache !== 'false'
  };

  const result = await pythonApiService.getDailyStats(params);

  if (!result.success) {
    return next(new AppError('获取每日统计失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getWeekdayStats = catchAsync(async (req, res, next) => {
  const { city, industry, days = 90, use_cache: useCache = true } = req.query;

  logger.info(`Getting weekday stats`);

  const params = {
    city: city || undefined,
    industry: industry || undefined,
    days: parseInt(days),
    use_cache: useCache !== 'false'
  };

  const result = await pythonApiService.getWeekdayStats(params);

  if (!result.success) {
    return next(new AppError('获取星期统计失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getDashboard = catchAsync(async (req, res, next) => {
  const { city, use_cache: useCache = true } = req.query;

  logger.info(`Getting realtime dashboard`);

  const result = await pythonApiService.getDashboard(city);

  if (!result.success) {
    return next(new AppError('获取实时看板失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getCombinedAnalysis = catchAsync(async (req, res, next) => {
  const { keyword, city, days = 30 } = req.query;

  logger.info(`Getting combined analysis for keyword: ${keyword}, city: ${city}`);

  const [wordCloudResult, salaryDistResult, heatmapResult, dailyStatsResult] = await Promise.all([
    pythonApiService.getWordCloud({ keyword, city, days: parseInt(days) }).catch(() => null),
    pythonApiService.getSalaryDistribution({ keyword, city }).catch(() => null),
    pythonApiService.getHeatmap({ keyword, days: parseInt(days) }).catch(() => null),
    pythonApiService.getDailyStats({ city, days: parseInt(days) }).catch(() => null)
  ]);

  const result = {
    keyword: keyword || null,
    city: city || null,
    days: parseInt(days),
    generated_at: new Date().toISOString(),
    wordcloud: wordCloudResult?.success ? wordCloudResult.data : null,
    salary_distribution: salaryDistResult?.success ? salaryDistResult.data : null,
    heatmap: heatmapResult?.success ? heatmapResult.data : null,
    daily_stats: dailyStatsResult?.success ? dailyStatsResult.data : null
  };

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  getWordCloud,
  getSalaryDistribution,
  getSalaryByGroup,
  getSalaryTrend,
  getHeatmap,
  getDailyStats,
  getWeekdayStats,
  getDashboard,
  getCombinedAnalysis
};
