/**
 * Like auth(), but does NOT reject unauthenticated requests — used on public
 * routes (feed, public profile) that still want to personalize the response
 * (e.g. isSaved flags) when a valid token happens to be present.
 *
 * Wire this to attempt the same JWT verification your real auth() does,
 * but swallow the failure and call next() with req.user left undefined
 * instead of throwing 401.
 */

const optionalAuth = (req, _res, next) => {
  // TODO: replace with real token verification against your auth module.
  // On success: req.user = decodedUser
  // On failure or missing token: leave req.user undefined, do NOT throw.
  next();
};

export default optionalAuth;
