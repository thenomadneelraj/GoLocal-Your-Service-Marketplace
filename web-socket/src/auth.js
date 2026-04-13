const jwt = require("jsonwebtoken");

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
  try {
    const auth = socket.handshake?.auth || {};
    const query = socket.handshake?.query || {};
    
    // Try to get JWT token from auth object or query
    const token = auth.token || query.token || auth.authorization || query.authorization;
    
    if (!token) {
      console.log("Socket connection rejected: No token provided");
      next(new Error("Authentication required"));
      return;
    }
    
    // Remove Bearer prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, "");
    
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    
    // Validate that the token contains user information
    const userId = decoded.accountId || decoded.userId || decoded.id;
    if (!userId) {
      console.log("Socket connection rejected: Invalid token - missing user ID");
      next(new Error("Invalid token"));
      return;
    }
    
    // Attach user info to socket
    socket.data.userId = userId;
    socket.data.role = decoded.role || "user";
    
    console.log(`Socket authenticated: User ${userId} (${socket.data.role})`);
    next();
  } catch (error) {
    console.log("Socket authentication error:", error.message);
    next(new Error("Authentication failed"));
  }
};

module.exports = { authenticateSocket };