// middlewares/internalOnly.js
//
// Guards a route so it can only be called by your own Next.js server
// (server-to-server), never directly by a browser. Apply this ONLY on the
// specific auth routes that Next.js's /api/auth/* route handlers call —
// do NOT apply it globally in app.js, since your other API routes (images,
// hotspots, analytics, etc.) still need to be reachable by the browser
// directly with a normal Bearer access token.
//
// Set INTERNAL_API_SECRET to a long random value (openssl rand -hex 32),
// identically in this backend's .env and in the Next.js app's .env.local.

const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');

const internalOnly = (req, res, next) => {
  const provided = req.header('x-internal-secret');
  if (!provided || provided !== config.internalApiSecret) {
    // 404, not 401 — this doesn't even acknowledge the route exists to
    // anyone who doesn't already have the secret.
    return next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
  }
  next();
};

module.exports = internalOnly;
