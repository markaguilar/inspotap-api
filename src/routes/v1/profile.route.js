const express = require('express');

const auth = require('../../middlewares/auth');
const optionalAuth = require('../../middlewares/optionalAuth');
const validate = require('../../middlewares/validate');

const profileValidation = require('../../validations/profile.validation');
const { profileController } = require('../../controllers');

const router = express.Router();

router.get('/users/me', auth(), profileController.getMe);
router.patch('/users/me', auth(), validate(profileValidation.updateProfile), profileController.updateMe);
router.get('/u/:username', optionalAuth, validate(profileValidation.getPublicProfile), profileController.getPublicProfile);

module.exports = router;
