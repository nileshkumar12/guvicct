const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const { has: isBlacklisted } = require("../utils/tokenBlacklist");

const optionalAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization
    ? authorization.replace(/^Bearer\s+/i, "").trim()
    : req.headers["x-auth-token"];

  if (!token) return next();

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    if (isBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: "Token has been logged out.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }
    return next(error);
  }
};

module.exports = { optionalAuth };
