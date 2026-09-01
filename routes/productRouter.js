const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });
const productImageUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', auth, productImageUpload, createProduct);
router.put('/:id', auth, productImageUpload, updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;
