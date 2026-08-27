const express = require('express');
const router = express.Router();
const { SendContactEmail} = require('../controllers/contactEmailController');

router.post("/", SendContactEmail);


module.exports = router;