const pythonApiService = require('../services/pythonApiService');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');

const createComparison = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  let userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    userSessionId = uuidv4();
    res.setHeader('X-User-Session-Id', userSessionId);
  }

  logger.info(`Creating comparison for user: ${userSessionId}`);

  const result = await pythonApiService.createComparison(userSessionId, name || '对比分析');

  if (!result.success) {
    return next(new AppError('创建对比会话失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const getComparison = catchAsync(async (req, res, next) => {
  const { session_id: sessionId } = req.params;

  if (!sessionId || isNaN(parseInt(sessionId))) {
    return next(new AppError('无效的对比会话ID', 400));
  }

  logger.info(`Getting comparison session: ${sessionId}`);

  const result = await pythonApiService.getComparison(parseInt(sessionId));

  if (!result.success) {
    return next(new AppError('获取对比会话失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const addToComparison = catchAsync(async (req, res, next) => {
  const { job_id: jobId, session_id: sessionId } = req.body;

  if (!jobId) {
    return next(new AppError('请提供职位ID', 400));
  }

  let targetSessionId = sessionId;

  if (!targetSessionId) {
    let userSessionId = req.headers['x-user-session-id'];
    if (!userSessionId) {
      userSessionId = uuidv4();
      res.setHeader('X-User-Session-Id', userSessionId);
    }
    
    const createResult = await pythonApiService.createComparison(userSessionId, '对比分析');
    if (createResult.success) {
      targetSessionId = createResult.data.session_id;
    } else {
      return next(new AppError('创建对比会话失败', 500));
    }
  }

  const comparisonResult = await pythonApiService.getComparison(parseInt(targetSessionId));
  if (comparisonResult.success && comparisonResult.data) {
    const currentCount = comparisonResult.data.jobs?.length || 0;
    if (currentCount >= config.comparison.maxItems) {
      return res.status(400).json({
        success: false,
        message: `对比面板最多只能添加 ${config.comparison.maxItems} 个职位`
      });
    }
  }

  logger.info(`Adding job ${jobId} to comparison ${targetSessionId}`);

  const result = await pythonApiService.addToComparison(parseInt(jobId), parseInt(targetSessionId));

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message || '添加到对比失败'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      session_id: targetSessionId,
      item_id: result.data?.item_id
    }
  });
});

const removeFromComparison = catchAsync(async (req, res, next) => {
  const { session_id: sessionId, job_id: jobId } = req.query;

  if (!sessionId || !jobId) {
    return next(new AppError('请提供对比会话ID和职位ID', 400));
  }

  logger.info(`Removing job ${jobId} from comparison ${sessionId}`);

  const result = await pythonApiService.removeFromComparison(parseInt(sessionId), parseInt(jobId));

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message || '从对比中移除失败'
    });
  }

  res.status(200).json({
    success: true,
    message: result.message
  });
});

const batchAddToComparison = catchAsync(async (req, res, next) => {
  const { job_ids: jobIds, session_id: sessionId } = req.body;

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    return next(new AppError('请提供职位ID列表', 400));
  }

  if (jobIds.length > config.comparison.maxItems) {
    return res.status(400).json({
      success: false,
      message: `一次最多只能添加 ${config.comparison.maxItems} 个职位进行对比`
    });
  }

  let targetSessionId = sessionId;

  if (!targetSessionId) {
    let userSessionId = req.headers['x-user-session-id'];
    if (!userSessionId) {
      userSessionId = uuidv4();
      res.setHeader('X-User-Session-Id', userSessionId);
    }
    
    const createResult = await pythonApiService.createComparison(userSessionId, '批量对比');
    if (createResult.success) {
      targetSessionId = createResult.data.session_id;
    } else {
      return next(new AppError('创建对比会话失败', 500));
    }
  }

  const added = [];
  const failed = [];

  for (const jobId of jobIds) {
    try {
      const result = await pythonApiService.addToComparison(parseInt(jobId), parseInt(targetSessionId));
      if (result.success) {
        added.push(jobId);
      } else {
        failed.push({ jobId, reason: result.message });
      }
    } catch (error) {
      failed.push({ jobId, reason: error.message });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      session_id: targetSessionId,
      added_count: added.length,
      failed_count: failed.length,
      added_jobs: added,
      failed_jobs: failed
    }
  });
});

const generateComparisonReport = catchAsync(async (req, res, next) => {
  const { session_id: sessionId } = req.params;

  if (!sessionId || isNaN(parseInt(sessionId))) {
    return next(new AppError('无效的对比会话ID', 400));
  }

  const result = await pythonApiService.getComparison(parseInt(sessionId));

  if (!result.success || !result.data) {
    return next(new AppError('获取对比会话失败', 500));
  }

  const jobs = result.data.jobs || [];

  if (jobs.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        session_id: sessionId,
        message: '没有要对比的职位'
      }
    });
  }

  const report = {
    session_id: sessionId,
    generated_at: new Date().toISOString(),
    job_count: jobs.length,
    comparisons: {
      salary: {
        min: Math.min(...jobs.map(j => j.salary_min || 0)),
        max: Math.max(...jobs.map(j => j.salary_max || 0)),
        average: jobs.reduce((sum, j) => sum + (j.salary_min || 0), 0) / jobs.length
      },
      cities: [...new Set(jobs.map(j => j.city).filter(Boolean))],
      educations: [...new Set(jobs.map(j => j.education).filter(Boolean))],
      experiences: [...new Set(jobs.map(j => j.experience).filter(Boolean))],
      common_skills: [],
      unique_skills: {}
    },
    jobs: jobs.map(j => ({
      id: j.id,
      title: j.title,
      company_name: j.company_name,
      salary_range: `${j.salary_min || '面议'}-${j.salary_max || '面议'}`,
      city: j.city,
      education: j.education,
      experience: j.experience,
      skills: j.skills
    }))
  };

  const skillMap = new Map();
  jobs.forEach((job, index) => {
    try {
      const skills = JSON.parse(job.skills || '[]');
      skills.forEach(skill => {
        if (!skillMap.has(skill)) {
          skillMap.set(skill, new Set());
        }
        skillMap.get(skill).add(index);
      });
    } catch (e) {
      // ignore
    }
  });

  const commonSkills = [];
  skillMap.forEach((jobIndices, skill) => {
    if (jobIndices.size === jobs.length) {
      commonSkills.push(skill);
    } else {
      jobIndices.forEach(index => {
        if (!report.comparisons.unique_skills[index]) {
          report.comparisons.unique_skills[index] = [];
        }
        report.comparisons.unique_skills[index].push(skill);
      });
    }
  });

  report.comparisons.common_skills = commonSkills;

  res.status(200).json({
    success: true,
    data: report
  });
});

module.exports = {
  createComparison,
  getComparison,
  addToComparison,
  removeFromComparison,
  batchAddToComparison,
  generateComparisonReport
};
