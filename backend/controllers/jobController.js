const pythonApiService = require('../services/pythonApiService');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config/config');

const searchJobs = catchAsync(async (req, res, next) => {
  const {
    keyword,
    city,
    company,
    salary_min: salaryMin,
    salary_max: salaryMax,
    education,
    experience,
    job_type: jobType,
    industry,
    source_id: sourceId,
    page = 1,
    page_size: pageSize = config.pagination.defaultPageSize,
    sort_by: sortBy = 'publish_date',
    sort_order: sortOrder = 'desc'
  } = req.query;

  const params = {
    keyword: keyword || undefined,
    city: city || undefined,
    company: company || undefined,
    salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
    salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
    education: education || undefined,
    experience: experience || undefined,
    job_type: jobType || undefined,
    industry: industry || undefined,
    source_id: sourceId ? parseInt(sourceId) : undefined,
    page: parseInt(page),
    page_size: Math.min(parseInt(pageSize), config.pagination.maxPageSize),
    sort_by: sortBy,
    sort_order: sortOrder
  };

  logger.info(`Searching jobs with params: ${JSON.stringify(params)}`);

  const result = await pythonApiService.searchJobs(params);

  if (!result.success) {
    return next(new AppError('搜索职位失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getJobDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return next(new AppError('无效的职位ID', 400));
  }

  const result = await pythonApiService.getJobDetail(parseInt(id));

  if (!result.success) {
    return next(new AppError('获取职位详情失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getFilterOptions = catchAsync(async (req, res, next) => {
  const result = await pythonApiService.getFilterOptions();

  if (!result.success) {
    return next(new AppError('获取筛选选项失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getSearchSuggestions = catchAsync(async (req, res, next) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      data: { suggestions: [] }
    });
  }

  const params = {
    keyword: q,
    page: 1,
    page_size: 10
  };

  const result = await pythonApiService.searchJobs(params);

  if (!result.success) {
    return res.status(200).json({
      success: true,
      data: { suggestions: [] }
    });
  }

  const suggestions = [];
  const seen = new Set();

  result.data.items.forEach(job => {
    if (!seen.has(job.title) && job.title.includes(q)) {
      suggestions.push({
        text: job.title,
        type: 'job'
      });
      seen.add(job.title);
    }
    if (!seen.has(job.company_name) && job.company_name.includes(q)) {
      suggestions.push({
        text: job.company_name,
        type: 'company'
      });
      seen.add(job.company_name);
    }
  });

  res.status(200).json({
    success: true,
    data: {
      suggestions: suggestions.slice(0, 10)
    }
  });
});

const getRelatedJobs = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return next(new AppError('无效的职位ID', 400));
  }

  const detailResult = await pythonApiService.getJobDetail(parseInt(id));

  if (!detailResult.success || !detailResult.data) {
    return res.status(200).json({
      success: true,
      data: { jobs: [] }
    });
  }

  const job = detailResult.data;

  const keywords = [];
  if (job.title) {
    const titleWords = job.title.split(/[\s\-()]+/).filter(w => w.length > 1);
    keywords.push(...titleWords.slice(0, 3));
  }
  if (job.skills) {
    try {
      const skills = JSON.parse(job.skills);
      keywords.push(...skills.slice(0, 3));
    } catch (e) {
      // ignore
    }
  }

  let relatedJobs = [];

  for (const keyword of keywords.slice(0, 3)) {
    const params = {
      keyword,
      city: job.city,
      page: 1,
      page_size: 5
    };

    const result = await pythonApiService.searchJobs(params);

    if (result.success && result.data.items) {
      result.data.items.forEach(j => {
        if (j.id !== parseInt(id) && !relatedJobs.some(rj => rj.id === j.id)) {
          relatedJobs.push(j);
        }
      });
    }
  }

  relatedJobs = relatedJobs.slice(0, 10);

  res.status(200).json({
    success: true,
    data: {
      jobs: relatedJobs
    }
  });
});

module.exports = {
  searchJobs,
  getJobDetail,
  getFilterOptions,
  getSearchSuggestions,
  getRelatedJobs
};
