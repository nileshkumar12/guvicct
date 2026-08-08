const express = require('express');
const router  = express.Router();
const {protect, sellerOnly}= require("../middleware/auth")// adjust path/name
const {
  getSellerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationById,
} = require('../controllers/notificationController');

router.use(protect, sellerOnly); // all routes require auth + seller role

router.get('/',              getSellerNotifications);
router.get('/unread-count',  getUnreadCount);
router.put('/read-all',      markAllNotificationsRead);
router.put('/:notificationId/read', markNotificationRead);
router.delete('/:notificationId',   deleteNotification);
router.get('/:notificationId', getNotificationById); 
module.exports = router;