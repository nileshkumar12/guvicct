const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createBrand, getBrands, updateBrand, deleteBrand } = require('../controllers/brandController');

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

router.post('/', upload.single('image'), createBrand);
router.put('/:id', upload.single('image'), updateBrand);
router.delete('/:id', deleteBrand);
router.get('/', getBrands);

module.exports = router;
