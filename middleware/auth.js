const jwt = require('jsonwebtoken');
const { has: isBlacklisted } = require('../utils/tokenBlacklist');
const User = require('../models/userModel');


const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  if (isBlacklisted(token)) {
    return res.status(401).json({ success: false, message: 'Token has been logged out' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};



const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.headers['x-auth-token']) {
            token = req.headers['x-auth-token'];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id || decoded._id || decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const sellerOnly = (req, res, next) => {
    if (req.user && req.user.role === 'seller') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied. Sellers only.' });
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
};          

// Export callable middleware by default while preserving named helpers.
module.exports = auth;
module.exports.auth = auth;
module.exports.protect = protect;
module.exports.sellerOnly = sellerOnly;
module.exports.adminOnly = adminOnly;