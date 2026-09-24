const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { feedService } = require('../services');

const getFeed = catchAsync(async (req, res) => {
  const { cursor, limit } = req.query;
  // req.user is only present if auth middleware ran and a token was provided;
  // this route uses optionalAuth so anonymous viewers still get a feed.
  const viewerId = req.user?.id ?? null;
  const result = await feedService.getFeed(viewerId, cursor ?? null, Number(limit) || 20);
  res.status(httpStatus.OK).send(result);
});

module.exports = {
  getFeed,
};
