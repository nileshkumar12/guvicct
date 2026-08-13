const express = require('express');
const router  = express.Router();
const { protect, sellerOnly } = require('../middleware/auth'); 
const {
  createShipment,
  getSellerShipments,
  getShipmentById,
  updateShipmentStatus,
  trackShipment,
  cancelShipment,
} = require('../controllers/shipmentController');

// Public tracking route (no seller role needed)
router.get('/track/:trackingNumber', protect, trackShipment);

// Seller-only routes
router.use(protect, sellerOnly);
router.post('/',                       createShipment);
router.get('/',                        getSellerShipments);
router.get('/:shipmentId',             getShipmentById);
router.put('/:shipmentId/status',      updateShipmentStatus);
router.put('/:shipmentId/cancel',      cancelShipment);

module.exports = router;