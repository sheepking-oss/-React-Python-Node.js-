const express = require('express');
const favoriteController = require('../controllers/favoriteController');

const router = express.Router();

router.get('/', favoriteController.getFavorites);

router.get('/folders', favoriteController.getFavoriteFolders);

router.get('/check/:job_id', favoriteController.isFavorited);

router.post('/', favoriteController.addFavorite);

router.delete('/:job_id', favoriteController.removeFavorite);

router.put('/:job_id', favoriteController.updateFavorite);

module.exports = router;
