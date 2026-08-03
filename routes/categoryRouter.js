const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createCategory, getCategories, updateCategory, deleteCategory } = require('../controllers/categoryController');

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


// router.post('/', createCategory);
// router.get('/', getCategories);
// router.put('/:id', updateCategory);
// router.delete('/:id', deleteCategory);
router.post('/',  upload.single('image'), createCategory);
router.put('/:id', upload.single('image'), updateCategory);
router.delete('/:id',  deleteCategory);
router.get('/', getCategories);
// router.get('/:id', getCategory);


module.exports = router;
