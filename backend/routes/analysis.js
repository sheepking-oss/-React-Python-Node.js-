const express = require('express');
const analysisController = require('../controllers/analysisController');

const router = express.Router();

router.get('/wordcloud', analysisController.getWordCloud);

router.get('/salary/distribution', analysisController.getSalaryDistribution);

router.get('/salary/group', analysisController.getSalaryByGroup);

router.get('/salary/trend', analysisController.getSalaryTrend);

router.get('/heatmap', analysisController.getHeatmap);

router.get('/daily', analysisController.getDailyStats);

router.get('/weekday', analysisController.getWeekdayStats);

router.get('/dashboard', analysisController.getDashboard);

router.get('/combined', analysisController.getCombinedAnalysis);

module.exports = router;
