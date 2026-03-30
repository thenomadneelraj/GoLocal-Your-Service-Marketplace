const express = require('express');
const router = express.Router();

// Import controllers and middleware
const { register, signIn, getProfile, updateProfile, changePassword, deleteAccount, logout, getPlatformStatusController } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { enforceAccountAccess } = require("../middleware/accountAccess");
const { registerValidation, loginValidation, updateProfileValidation } = require('../validations/authValidation');

// Public routes
router.post('/register', registerValidation, register);
router.post('/signIn', loginValidation, signIn);
router.post('/logout', logout);
router.get('/platform-status', getPlatformStatusController);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, enforceAccountAccess, updateProfileValidation, updateProfile);
router.put('/password', authenticate, enforceAccountAccess, changePassword);
router.delete('/account', authenticate, enforceAccountAccess, deleteAccount);

module.exports = router;
