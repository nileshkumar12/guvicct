const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCategory, getCategories, updateCategory, deleteCategory } = require('../controllers/categoryController');

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
