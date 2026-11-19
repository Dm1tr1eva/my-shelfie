const express = require("express");
const authController = require("../controllers/authController");
const { optionalAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.post("/register", failsWith("Registration failed"), authController.register);
router.post("/login", failsWith("Login failed"), authController.login);
router.post("/logout", authController.logout);
router.get(
  "/me",
  optionalAuth,
  failsWith("Failed to fetch the current user"),
  authController.getMe,
);

module.exports = router;
