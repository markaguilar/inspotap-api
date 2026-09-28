const express = require('express');

const validate = require('../../middlewares/validate');

const feedController = require('../../controllers/feed.controller');

const feedValidation = require('../../validations/feed.validation');

const router = express.Router();

// public route, but personalizes isSaved flags if a valid token is present
router.route('/').get(validate(feedValidation.getFeed), feedController.getFeed);

module.exports = router;
