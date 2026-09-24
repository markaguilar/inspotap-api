const express = require('express');

const optionalAuth = require('../../middlewares/optionalAuth');
const validate = require('../../middlewares/validate');

const { feedController } = require('../../controllers');

const feedValidation = require('../../validations/feed.validation');

const router = express.Router();

// public route, but personalizes isSaved flags if a valid token is present
router.get('/', optionalAuth, validate(feedValidation.getFeed), feedController.getFeed);

module.exports = router;
