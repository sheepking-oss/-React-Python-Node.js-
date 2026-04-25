const express = require('express');
const comparisonController = require('../controllers/comparisonController');

const router = express.Router();

router.post('/create', comparisonController.createComparison);

router.post('/add', comparisonController.addToComparison);

router.post('/batch-add', comparisonController.batchAddToComparison);

router.delete('/remove', comparisonController.removeFromComparison);

router.get('/report/:session_id', comparisonController.generateComparisonReport);

router.get('/:session_id', comparisonController.getComparison);

module.exports = router;
