const pythonApiService = require('../services/pythonApiService');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const getFavorites = catchAsync(async (req, res, next) => {
  const { folder_name: folderName } = req.query;
  
  let userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    userSessionId = uuidv4();
    res.setHeader('X-User-Session-Id', userSessionId);
  }

  logger.info(`Getting favorites for user: ${userSessionId}`);

  const result = await pythonApiService.getFavorites(userSessionId, folderName);

  if (!result.success) {
    return next(new AppError('获取收藏列表失败', 500));
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const addFavorite = catchAsync(async (req, res, next) => {
  const { job_id: jobId, folder_name: folderName, notes } = req.body;

  if (!jobId) {
    return next(new AppError('请提供职位ID', 400));
  }

  let userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    userSessionId = uuidv4();
    res.setHeader('X-User-Session-Id', userSessionId);
  }

  logger.info(`Adding favorite for user: ${userSessionId}, job: ${jobId}`);

  const data = {
    job_id: parseInt(jobId),
    user_session_id: userSessionId,
    folder_name: folderName || '默认收藏夹',
    notes: notes
  };

  const result = await pythonApiService.addFavorite(data);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message || '收藏失败'
    });
  }

  res.status(200).json({
    success: true,
    data: result.data
  });
});

const removeFavorite = catchAsync(async (req, res, next) => {
  const { job_id: jobId } = req.params;

  if (!jobId) {
    return next(new AppError('请提供职位ID', 400));
  }

  const userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    return next(new AppError('请提供用户会话ID', 400));
  }

  logger.info(`Removing favorite for user: ${userSessionId}, job: ${jobId}`);

  const result = await pythonApiService.removeFavorite(parseInt(jobId), userSessionId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message || '取消收藏失败'
    });
  }

  res.status(200).json({
    success: true,
    message: result.message
  });
});

const isFavorited = catchAsync(async (req, res, next) => {
  const { job_id: jobId } = req.params;

  if (!jobId) {
    return next(new AppError('请提供职位ID', 400));
  }

  const userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    return res.status(200).json({
      success: true,
      data: { is_favorited: false }
    });
  }

  const result = await pythonApiService.getFavorites(userSessionId);

  if (!result.success) {
    return res.status(200).json({
      success: true,
      data: { is_favorited: false }
    });
  }

  const isFavorited = result.data.favorites?.some(fav => fav.job_id === parseInt(jobId)) || false;

  res.status(200).json({
    success: true,
    data: { is_favorited: isFavorited }
  });
});

const getFavoriteFolders = catchAsync(async (req, res, next) => {
  const userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    return res.status(200).json({
      success: true,
      data: { folders: ['默认收藏夹'] }
    });
  }

  const result = await pythonApiService.getFavorites(userSessionId);

  if (!result.success) {
    return res.status(200).json({
      success: true,
      data: { folders: ['默认收藏夹'] }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      folders: result.data.folders || ['默认收藏夹']
    }
  });
});

const updateFavorite = catchAsync(async (req, res, next) => {
  const { job_id: jobId } = req.params;
  const { folder_name: folderName, notes } = req.body;

  const userSessionId = req.headers['x-user-session-id'];
  
  if (!userSessionId) {
    return next(new AppError('请提供用户会话ID', 400));
  }

  const removeResult = await pythonApiService.removeFavorite(parseInt(jobId), userSessionId);
  
  if (folderName || notes) {
    const addData = {
      job_id: parseInt(jobId),
      user_session_id: userSessionId,
      folder_name: folderName || '默认收藏夹',
      notes: notes
    };
    
    const addResult = await pythonApiService.addFavorite(addData);
    
    if (!addResult.success) {
      return res.status(400).json({
        success: false,
        message: '更新收藏失败'
      });
    }
  }

  res.status(200).json({
    success: true,
    message: '更新收藏成功'
  });
});

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorited,
  getFavoriteFolders,
  updateFavorite
};
