const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { adminOrders, adminOrderDetails } = require('../controllers/orderController');

const { getAdminDashboard} = require("../controllers/adminDashboardController");
router.get( "/dashboard", auth, getAdminDashboard);
router.get('/orders', auth, adminOrders);
router.get('/orders/:id', auth, adminOrderDetails);

module.exports = router;