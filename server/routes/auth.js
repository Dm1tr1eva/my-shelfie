const express = require('express')
const authController = require('../controllers/authController')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.get('/me', optionalAuth, authController.getMe)

module.exports = router