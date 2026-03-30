const { body } = require("express-validator");

// Register validation rules
const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be exactly 10 digits"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),

  body("agreeToTerms")
    .isBoolean()
    .withMessage("You must agree to the terms and conditions")
    .custom((value) => value === true),
  body("profilePhoto")
    .optional()
    .isString()
    .withMessage("Profile photo must be a string")
    .isLength({ max: 50 * 1024 * 1024 })
    .withMessage("Profile photo is too large"),
];

// Login validation rules
const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

// Update profile validation rules
const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be exactly 10 digits"),

  body("profilePhoto")
    .optional()
    .isString()
    .withMessage("Profile photo must be a string")
    .isLength({ max: 50 * 1024 * 1024 })
    .withMessage("Profile photo is too large"),
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
};
