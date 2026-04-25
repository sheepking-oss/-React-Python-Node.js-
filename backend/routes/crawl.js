const express = require('express');
const crawlController = require('../controllers/crawlController');

const router = express.Router();

router.get('/health', crawlController.getHealthStatus);

router.get('/status', crawlController.getCrawlStatus);

router.get('/tasks', crawlController.getRecentCrawlTasks);

router.get('/task/:task_id', crawlController.getCrawlTask);

router.get('/task/:task_id/logs', crawlController.getCrawlLogs);

router.post('/start', crawlController.startCrawl);

router.post('/quick', crawlController.quickCrawl);

module.exports = router;
