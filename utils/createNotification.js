const Notification = require('../models/Notification');

const createNotification = async ({ sellerId, orderId, type, title, message }) => {
  try {
    await Notification.create({ sellerId, orderId, type, title, message });
  } catch (err) {
    console.error('Notification error:', err.message);
    // never crash the main flow if notification fails
  }
};

module.exports = createNotification;