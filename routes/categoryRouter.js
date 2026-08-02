const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCategory, getCategories, updateCategory, deleteCategory } = require('../controllers/categoryController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
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
