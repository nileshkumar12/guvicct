const { add } = require('../utils/tokenBlacklist');

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const parts = authHeader ? authHeader.split(' ') : [];
    const token = parts.length === 2 ? parts[1] : parts[0];

    if (token) add(token);

    return res.status(200).json({
      success: true,
      message: 'Logout successful. Token invalidated on server. Please remove token from client.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { logout };