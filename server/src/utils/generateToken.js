const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      accountId: user._id, // Add accountId for compatibility with middleware
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // Token expires in 1 day
  );
};

module.exports = generateToken;
