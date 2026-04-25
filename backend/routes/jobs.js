const express = require('express');
const jobController = require('../controllers/jobController');

const router = express.Router();

router.get('/search', jobController.searchJobs);

router.get('/filters/options', jobController.getFilterOptions);

router.get('/suggestions', jobController.getSearchSuggestions);

router.get('/related/:id', jobController.getRelatedJobs);

router.get('/:id', jobController.getJobDetail);

module.exports = router;
