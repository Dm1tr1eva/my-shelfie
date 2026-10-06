const jwt = require("jsonwebtoken");

function readUserId(req) {
  const token = req.cookies.token;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  if (!req.cookies.token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = readUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.userId = userId;
  next();
}

function optionalAuth(req, res, next) {
  req.userId = readUserId(req) ?? undefined;
  next();
}

module.exports = { requireAuth, optionalAuth };
