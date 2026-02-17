const express = require('express');
const router = express.Router();

// Import controllers and middleware
const { register, signIn, getProfile, updateProfile, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation, updateProfileValidation } = require('../validations/authValidation');

// Public routes
router.post('/register', registerValidation, register);
router.post('/signIn', loginValidation, signIn);
router.post('/logout', logout);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);

module.exports = router;
