const express = require('express');
const jobsRouter = require('./jobs');
const favoritesRouter = require('./favorites');
const comparisonsRouter = require('./comparisons');
const analysisRouter = require('./analysis');
const crawlRouter = require('./crawl');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

router.use('/jobs', jobsRouter);
router.use('/favorites', favoritesRouter);
router.use('/comparisons', comparisonsRouter);
router.use('/analysis', analysisRouter);
router.use('/crawl', crawlRouter);

module.exports = router;
