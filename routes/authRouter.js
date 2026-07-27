const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    login,
    forgotPassword,
    resetPassword,
    changePassword,
    getProfile,
    updateProfile,
} = require('../controllers/authController');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', auth, changePassword);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;
