const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { logout } = require("../controllers/logoutController");

router.post("/logout", auth, logout);

module.exports = router;