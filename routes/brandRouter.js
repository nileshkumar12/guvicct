const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createBrand, getBrands, updateBrand, deleteBrand } = require('../controllers/brandController');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/', upload.single('image'), createBrand);
router.put('/:id', upload.single('image'), updateBrand);
router.delete('/:id', deleteBrand);
router.get('/', getBrands);

module.exports = router;
