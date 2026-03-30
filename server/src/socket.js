let io;

module.exports = {
  init: (httpServer) => {
    const { Server } = require("socket.io");
    io = new Server(httpServer, {
      cors: {
        origin: "*", // Adjust this in production
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);
      
      socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  }
};
