const SellerNotification = require('../models/sellerNotificationModel');
// GET /api/seller/notifications
exports.getSellerNotifications = async (req, res) => {
  try {
    const notifications = await SellerNotification.find({ seller: req.user._id }) // ✅ "seller" not "sellerId"
      .populate('order', 'orderNumber total')                                      // ✅ "order" not "orderId"
      .sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /:notificationId/read
exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await SellerNotification.findOneAndUpdate(
      { _id: req.params.notificationId, seller: req.user._id }, 
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /read-all
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await SellerNotification.updateMany(
      { seller: req.user._id, isRead: false }, // ✅ "seller"
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /:notificationId
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await SellerNotification.findOneAndDelete({
      _id: req.params.notificationId,
      seller: req.user._id, // ✅ "seller"
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await SellerNotification.countDocuments({
      seller: req.user._id, // ✅ "seller"
      isRead: false
    });
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET /api/seller/notifications/:notificationId
exports.getNotificationById = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;

    // Support both JWT/user formats
    const sellerId = req.user?._id || req.user?.id;

    console.log("========== NOTIFICATION DETAILS ==========");
    console.log("notificationId:", notificationId);
    console.log("req.user:", req.user);
    console.log("sellerId:", sellerId);

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Seller authentication required",
      });
    }

    // First find notification by ID
    const notification = await SellerNotification.findById(
      notificationId
    ).populate(
      "order",
      "orderNumber total shippingAddress createdAt"
    );

    console.log(
      "Notification from DB:",
      notification
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    console.log(
      "Notification seller:",
      notification.seller
    );

    console.log(
      "Logged-in seller:",
      sellerId
    );

    // Check that notification belongs to logged-in seller
    if (
      String(notification.seller) !==
      String(sellerId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this notification",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });

  } catch (err) {
    console.error(
      "❌ getNotificationById error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};